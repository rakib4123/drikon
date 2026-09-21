import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { UserModel } from '../../models/user.model';
import { MailService } from '../mail/mail.service';
import type { GoogleUserPayload } from './strategies/google.strategy';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
  JwtTwoFactorPendingPayload,
  TokenPair,
} from './interfaces/jwt.interface';

interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

interface LoginResult {
  user: { id: string; email: string; name: string; role: string };
  tokens?: TokenPair;
  requiresTwoFactor?: boolean;
  /** Set instead of `tokens` when a Google sign-in still owes a second factor. */
  twoFactorPendingToken?: string;
}

/** Why a Google sign-in was refused — the controller maps these to a login-page message. */
export class GoogleLoginRejected extends Error {
  constructor(public readonly reason: 'unverified_email' | 'locked') {
    super(reason);
  }
}

const TWO_FACTOR_PENDING_TTL_SECONDS = 300;

/** Failure records need an IP key even when the request's IP is unknown. */
const ipKey = (ip: string | undefined) => ip || 'unknown';

/**
 * The single source of truth for everything authentication.
 *
 * Security choices made here are deliberate; see ARCHITECTURE.md §7.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // argon2id parameters — tuned to ~250 ms on a modern CPU
  private readonly argonOptions: argon2.Options;

  constructor(
    private readonly users: UserModel,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.argonOptions = {
      type: argon2.argon2id,
      memoryCost: config.get<number>('ARGON2_MEMORY_COST', 65_536),
      timeCost: config.get<number>('ARGON2_TIME_COST', 3),
      parallelism: config.get<number>('ARGON2_PARALLELISM', 4),
    };

    // TOTP defaults: 6 digits, 30s window, 1 step skew tolerance
    authenticator.options = { window: 1 };
  }

  // ───────────────────────────────────────────────────────────────────
  // REGISTRATION
  // ───────────────────────────────────────────────────────────────────

  async register(input: { email: string; password: string; name: string }): Promise<{ message: string }> {
    const existing = await this.users.findUnique({ where: { email: input.email } });
    if (existing) {
      // Return the SAME message as success — never leak which emails are registered.
      return { message: 'Account created. Please check your email to verify.' };
    }

    const passwordHash = await argon2.hash(input.password, this.argonOptions);

    const user = await this.users.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
      },
    });

    // Issue verification token (raw token sent in mail, hash stored)
    const { raw, hash } = this.generateOneTimeToken();
    await this.users.createVerificationToken({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    await this.mail.sendVerificationEmail(user.email, user.name, raw);

    this.logger.log({ msg: 'user.registered', userId: user.id });
    return { message: 'Account created. Please check your email to verify.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const hash = this.hashToken(token);
    const row = await this.users.findVerificationToken(hash);
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.users.consumeVerificationToken(row.id, row.userId);
    return { message: 'Email verified successfully.' };
  }

  // ───────────────────────────────────────────────────────────────────
  // LOGIN
  // ───────────────────────────────────────────────────────────────────

  async login(
    input: { email: string; password: string; twoFactorCode?: string },
    ctx: LoginContext,
  ): Promise<LoginResult> {
    const user = await this.users.findUnique({
      where: { email: input.email },
      include: { twoFactorSecret: true },
    });

    // Constant-time-ish: we still run a fake hash check if user doesn't exist,
    // so attackers can't distinguish "no such user" from "wrong password" via timing.
    if (!user || !user.passwordHash) {
      await argon2.hash('dummy-password', this.argonOptions).catch(() => undefined);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Lockouts: account-wide (distributed guessing) or just from this IP.
    await this.assertNotLocked(user, ctx.ipAddress);

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      await this.handleFailedLogin(user, ctx.ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2FA check — a TOTP code, or one of the single-use recovery codes issued at setup.
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!input.twoFactorCode) {
        return {
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          requiresTwoFactor: true,
        };
      }
      const valid = await this.verifySecondFactor(
        user.id,
        user.twoFactorSecret,
        input.twoFactorCode,
      );
      if (!valid) {
        // A wrong second factor counts toward the account lockout. Otherwise
        // anyone holding the password could guess 6-digit codes, bounded only
        // by the per-IP rate limit.
        await this.handleFailedLogin(user, ctx.ipAddress);
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    // (Optional) email-verified gate. Comment out for friendlier dev experience.
    // if (!user.emailVerified) throw new ForbiddenException('Email not verified');

    // Successful login — clear failed counters, issue tokens
    await this.users.clearLoginFailures(user.id, ipKey(ctx.ipAddress));
    await this.users.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ctx.ipAddress,
      },
    });

    const tokens = await this.issueTokenPair(user, ctx);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  private async assertNotLocked(user: User, ipAddress: string | undefined): Promise<void> {
    const accountLocked = !!user.lockedUntil && user.lockedUntil > new Date();
    if (accountLocked || (await this.users.isLoginLockedFromIp(user.id, ipKey(ipAddress)))) {
      throw new UnauthorizedException(
        'Account temporarily locked due to too many failed attempts. Try again later.',
      );
    }
  }

  /**
   * Records a failed sign-in and decides what, if anything, to lock.
   *
   * It used to lock the whole account after five failures from anywhere, so
   * anyone who knew an address — the admin's was public — could keep its owner
   * locked out indefinitely. Now:
   *  - ACCOUNT_LOCK_THRESHOLD failures from one IP lock the account from that
   *    IP only; the owner elsewhere is unaffected.
   *  - ACCOUNT_LOCK_GLOBAL_THRESHOLD failures within an hour across all IPs
   *    still lock the whole account, to slow guessing spread over many IPs.
   */
  private async handleFailedLogin(user: User, ipAddress: string | undefined): Promise<void> {
    const perIp = this.config.get<number>('ACCOUNT_LOCK_THRESHOLD', 5);
    const global = this.config.get<number>('ACCOUNT_LOCK_GLOBAL_THRESHOLD', 50);
    const duration = this.config.get<number>('ACCOUNT_LOCK_DURATION', 1800);
    const ip = ipKey(ipAddress);
    const until = new Date(Date.now() + duration * 1000);

    const fromThisIp = await this.users.recordLoginFailure(user.id, ip, duration);
    if (fromThisIp >= perIp) {
      await this.users.lockLoginFromIp(user.id, ip, until);
      this.logger.warn({ msg: 'account.locked_for_ip', userId: user.id, ip, attempts: fromThisIp });
    }

    const recentTotal = await this.users.recentLoginFailures(user.id, 3600);
    const lockAccount = recentTotal >= global;
    await this.users.update({
      where: { id: user.id },
      data: {
        // Kept as a running tally for the admin users list.
        failedLoginAttempts: user.failedLoginAttempts + 1,
        ...(lockAccount ? { lockedUntil: until } : {}),
      },
    });
    if (lockAccount) {
      this.logger.warn({ msg: 'account.locked', userId: user.id, recentTotal });
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH
  // ───────────────────────────────────────────────────────────────────

  async loginWithGoogle(payload: GoogleUserPayload, ctx: LoginContext): Promise<LoginResult> {
    // Matching on email (below) auto-links to an existing password account, so
    // Google must vouch that the person owns that address — otherwise an
    // unverified Google email is a takeover of whoever registered it here.
    if (!payload.emailVerified) throw new GoogleLoginRejected('unverified_email');

    // Upsert by googleId, falling back to email match.
    let user = await this.users.findFirst({
      where: { OR: [{ googleId: payload.googleId }, { email: payload.email }] },
      include: { twoFactorSecret: true },
    });

    if (!user) {
      user = await this.users.create({
        data: {
          email: payload.email,
          name: payload.name,
          avatarUrl: payload.avatarUrl,
          googleId: payload.googleId,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: new Date(),
        },
        include: { twoFactorSecret: true },
      });
    } else if (!user.googleId) {
      // Existing email account — link Google identity.
      user = await this.users.update({
        where: { id: user.id },
        data: {
          googleId: payload.googleId,
          emailVerified: user.emailVerified ?? new Date(),
        },
        include: { twoFactorSecret: true },
      });
    }

    // Google is a first factor like a password: it can't skip a lockout...
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new GoogleLoginRejected('locked');

    const summary = { id: user.id, email: user.email, name: user.name, role: user.role };

    // ...or the second factor. It used to issue a full session here, so an
    // account with 2FA on could be entered through Google with no code at all.
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const pending: JwtTwoFactorPendingPayload = { sub: user.id, type: '2fa_pending' };
      const twoFactorPendingToken = await this.jwt.signAsync(pending, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: TWO_FACTOR_PENDING_TTL_SECONDS,
      });
      return { user: summary, requiresTwoFactor: true, twoFactorPendingToken };
    }

    const tokens = await this.issueTokenPair(user, ctx);
    return { user: summary, tokens };
  }

  /**
   * Completes a sign-in that is waiting on its second factor (currently: Google
   * sign-in for a 2FA account). Wrong codes count toward the account lockout.
   */
  async verifyPendingTwoFactor(pendingToken: string, code: string, ctx: LoginContext): Promise<LoginResult> {
    let payload: JwtTwoFactorPendingPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtTwoFactorPendingPayload>(pendingToken, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Your sign-in expired — please sign in again');
    }
    if (payload.type !== '2fa_pending') throw new UnauthorizedException('Invalid sign-in state');

    const user = await this.users.findUnique({
      where: { id: payload.sub },
      include: { twoFactorSecret: true },
    });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Invalid sign-in state');
    }
    await this.assertNotLocked(user, ctx.ipAddress);

    const valid = await this.verifySecondFactor(user.id, user.twoFactorSecret, code);
    if (!valid) {
      await this.handleFailedLogin(user, ctx.ipAddress);
      throw new UnauthorizedException('Invalid 2FA code');
    }
    await this.users.clearLoginFailures(user.id, ipKey(ctx.ipAddress));

    await this.users.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ctx.ipAddress },
    });
    const tokens = await this.issueTokenPair(user, ctx);
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, tokens };
  }

  // ───────────────────────────────────────────────────────────────────
  // REFRESH TOKEN ROTATION
  // ───────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string, ctx: LoginContext): Promise<TokenPair> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Wrong token type');

    const tokenHash = this.hashToken(refreshToken);
    const session = await this.users.findSessionByRefreshHash(tokenHash);

    // Token reuse detection: refresh was valid JWT but not in DB → it was rotated.
    // This is a strong signal of theft. Nuke everything for that user.
    if (!session) {
      this.logger.warn({ msg: 'refresh.reuse_detected', sub: payload.sub });
      await this.users.deleteSessionsForUser(payload.sub);
      throw new UnauthorizedException('Token reuse detected — all sessions revoked');
    }
    if (session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotation: invalidate old, issue new.
    await this.users.deleteSession(session.id);
    return this.issueTokenPair(session.user, ctx);
  }

  // ───────────────────────────────────────────────────────────────────
  // LOGOUT
  // ───────────────────────────────────────────────────────────────────

  async logout(refreshToken?: string): Promise<{ message: string }> {
    if (!refreshToken) return { message: 'Logged out' };
    const tokenHash = this.hashToken(refreshToken);
    await this.users.deleteSessionsByRefreshHash(tokenHash);
    return { message: 'Logged out' };
  }

  async logoutEverywhere(userId: string): Promise<{ message: string }> {
    await this.users.deleteSessionsForUser(userId);
    return { message: 'All sessions revoked' };
  }

  // ───────────────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ───────────────────────────────────────────────────────────────────

  async forgotPassword(email: string, ipAddress?: string): Promise<{ message: string }> {
    const user = await this.users.findUnique({ where: { email } });
    // Always return the same response — no user enumeration.
    if (user && user.authProvider === AuthProvider.LOCAL) {
      const { raw, hash } = this.generateOneTimeToken();
      await this.users.createPasswordResetToken({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
          ipAddress,
        },
      });
      await this.mail.sendPasswordResetEmail(user.email, user.name, raw);
    }
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const hash = this.hashToken(token);
    const row = await this.users.findPasswordResetToken(hash);
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await argon2.hash(newPassword, this.argonOptions);
    // Also revokes all sessions — force re-login everywhere after a password reset.
    await this.users.resetPasswordTransaction(row.id, row.userId, passwordHash);
    return { message: 'Password updated. Please log in again.' };
  }

  // ───────────────────────────────────────────────────────────────────
  // 2FA (TOTP)
  // ───────────────────────────────────────────────────────────────────

  async setup2FA(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const user = await this.users.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA already enabled');
    }
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'Drikon', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    // Store secret but don't enable until verified.
    await this.users.upsertTwoFactorSecret({
      where: { userId },
      create: { userId, secret, recoveryCodes: [] },
      update: { secret, recoveryCodes: [] },
    });
    return { secret, qrCodeDataUrl };
  }

  async enable2FA(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const row = await this.users.findTwoFactorSecret(userId);
    if (!row) throw new BadRequestException('Run 2FA setup first');
    if (!authenticator.check(code, row.secret)) {
      throw new BadRequestException('Invalid code');
    }
    // Generate one-time recovery codes (10 × 10 chars). Store hashes.
    const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(5).toString('hex'));
    const hashedCodes = recoveryCodes.map((c) => this.hashToken(c.toLowerCase()));
    await this.users.enableTwoFactorTransaction(userId, hashedCodes);
    return { recoveryCodes };
  }

  async disable2FA(userId: string, code: string): Promise<{ message: string }> {
    const row = await this.users.findTwoFactorSecret(userId);
    if (!row) throw new BadRequestException('2FA not enabled');
    const valid = await this.verifySecondFactor(userId, row, code);
    if (!valid) throw new BadRequestException('Invalid code');
    await this.users.disableTwoFactorTransaction(userId);
    return { message: '2FA disabled' };
  }

  /**
   * Accepts either a live TOTP code or an unused recovery code.
   *
   * Recovery codes were being generated, hashed and stored at setup but never
   * checked anywhere, so losing the authenticator meant losing the account. A
   * consumed code is deleted immediately — each one works exactly once.
   */
  private async verifySecondFactor(
    userId: string,
    row: { secret: string; recoveryCodes: string[] },
    code: string,
  ): Promise<boolean> {
    const submitted = code.trim();
    if (!submitted) return false;

    if (authenticator.check(submitted, row.secret)) return true;

    const submittedHash = this.hashToken(submitted.toLowerCase());
    if (!row.recoveryCodes.includes(submittedHash)) return false;

    // The DB write is the real check: it only succeeds if the code was still
    // unused, so two parallel logins can't both spend the same one.
    const consumed = await this.users.consumeRecoveryCode(userId, submittedHash);
    if (!consumed) return false;

    this.logger.warn({ msg: 'auth.recovery_code_used', userId });
    return true;
  }

  // ───────────────────────────────────────────────────────────────────
  // ME
  // ───────────────────────────────────────────────────────────────────

  /**
   * The signed-in user's public profile. `/auth/me` used to return only the
   * JWT-derived {id, email, role} — no name — so the dashboard greeted people
   * as "Hi, ." and the header never showed their name.
   */
  async getMe(userId: string) {
    return this.users.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        twoFactorEnabled: true,
        authProvider: true,
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // TOKEN HELPERS
  // ───────────────────────────────────────────────────────────────────

  private async issueTokenPair(user: User, ctx: LoginContext): Promise<TokenPair> {
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL') ?? 900);
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL') ?? 604_800);

    const sessionId = randomUUID();
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: accessJti,
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      sid: sessionId,
      type: 'refresh',
      jti: refreshJti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      }),
    ]);

    // Store HASH of refresh token, never the raw value.
    await this.users.createSession({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  // ───────────────────────────────────────────────────────────────────
  // PRIMITIVES
  // ───────────────────────────────────────────────────────────────────

  /** Generates a URL-safe 32-byte token and its SHA-256 hash. */
  private generateOneTimeToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: this.hashToken(raw) };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
