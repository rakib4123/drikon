import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, Prisma, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { GoogleUserPayload } from './strategies/google.strategy';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
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
}

/**
 * The single source of truth for everything authentication.
 *
 * Security choices made here are deliberate; see ARCHITECTURE.md §6.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // argon2id parameters — tuned to ~250 ms on a modern CPU
  private readonly argonOptions: argon2.Options;

  constructor(
    private readonly prisma: PrismaService,
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
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Return the SAME message as success — never leak which emails are registered.
      return { message: 'Account created. Please check your email to verify.' };
    }

    const passwordHash = await argon2.hash(input.password, this.argonOptions);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
      },
    });

    // Issue verification token (raw token sent in mail, hash stored)
    const { raw, hash } = this.generateOneTimeToken();
    await this.prisma.verificationToken.create({
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
    const row = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: hash },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { emailVerified: new Date() },
      }),
      this.prisma.verificationToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { message: 'Email verified successfully.' };
  }

  // ───────────────────────────────────────────────────────────────────
  // LOGIN
  // ───────────────────────────────────────────────────────────────────

  async login(
    input: { email: string; password: string; twoFactorCode?: string },
    ctx: LoginContext,
  ): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { twoFactorSecret: true },
    });

    // Constant-time-ish: we still run a fake hash check if user doesn't exist,
    // so attackers can't distinguish "no such user" from "wrong password" via timing.
    if (!user || !user.passwordHash) {
      await argon2.hash('dummy-password', this.argonOptions).catch(() => undefined);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked due to too many failed attempts. Try again later.',
      );
    }

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2FA check
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!input.twoFactorCode) {
        return {
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          requiresTwoFactor: true,
        };
      }
      const valid = authenticator.check(input.twoFactorCode, user.twoFactorSecret.secret);
      if (!valid) throw new UnauthorizedException('Invalid 2FA code');
    }

    // (Optional) email-verified gate. Comment out for friendlier dev experience.
    // if (!user.emailVerified) throw new ForbiddenException('Email not verified');

    // Successful login — clear failed counters, issue tokens
    await this.prisma.user.update({
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

  private async handleFailedLogin(user: User): Promise<void> {
    const threshold = this.config.get<number>('ACCOUNT_LOCK_THRESHOLD', 5);
    const duration = this.config.get<number>('ACCOUNT_LOCK_DURATION', 1800);
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= threshold;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + duration * 1000) : null,
      },
    });
    if (shouldLock) {
      this.logger.warn({ msg: 'account.locked', userId: user.id, attempts });
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH
  // ───────────────────────────────────────────────────────────────────

  async loginWithGoogle(payload: GoogleUserPayload, ctx: LoginContext): Promise<LoginResult> {
    // Upsert by googleId, falling back to email match.
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.googleId }, { email: payload.email }] },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          avatarUrl: payload.avatarUrl,
          googleId: payload.googleId,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: new Date(),
        },
      });
    } else if (!user.googleId) {
      // Existing email account — link Google identity.
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.googleId,
          emailVerified: user.emailVerified ?? new Date(),
        },
      });
    }

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
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    // Token reuse detection: refresh was valid JWT but not in DB → it was rotated.
    // This is a strong signal of theft. Nuke everything for that user.
    if (!session) {
      this.logger.warn({ msg: 'refresh.reuse_detected', sub: payload.sub });
      await this.prisma.session.deleteMany({ where: { userId: payload.sub } });
      throw new UnauthorizedException('Token reuse detected — all sessions revoked');
    }
    if (session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotation: invalidate old, issue new.
    await this.prisma.session.delete({ where: { id: session.id } });
    return this.issueTokenPair(session.user, ctx);
  }

  // ───────────────────────────────────────────────────────────────────
  // LOGOUT
  // ───────────────────────────────────────────────────────────────────

  async logout(refreshToken?: string): Promise<{ message: string }> {
    if (!refreshToken) return { message: 'Logged out' };
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.session.deleteMany({ where: { refreshTokenHash: tokenHash } });
    return { message: 'Logged out' };
  }

  async logoutEverywhere(userId: string): Promise<{ message: string }> {
    await this.prisma.session.deleteMany({ where: { userId } });
    return { message: 'All sessions revoked' };
  }

  // ───────────────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ───────────────────────────────────────────────────────────────────

  async forgotPassword(email: string, ipAddress?: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return the same response — no user enumeration.
    if (user && user.authProvider === AuthProvider.LOCAL) {
      const { raw, hash } = this.generateOneTimeToken();
      await this.prisma.passwordResetToken.create({
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
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hash },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await argon2.hash(newPassword, this.argonOptions);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all sessions — force re-login everywhere after a password reset.
      this.prisma.session.deleteMany({ where: { userId: row.userId } }),
    ]);
    return { message: 'Password updated. Please log in again.' };
  }

  // ───────────────────────────────────────────────────────────────────
  // 2FA (TOTP)
  // ───────────────────────────────────────────────────────────────────

  async setup2FA(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA already enabled');
    }
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'Drikon', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    // Store secret but don't enable until verified.
    await this.prisma.twoFactorSecret.upsert({
      where: { userId },
      create: { userId, secret, recoveryCodes: [] },
      update: { secret, recoveryCodes: [] },
    });
    return { secret, qrCodeDataUrl };
  }

  async enable2FA(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const row = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!row) throw new BadRequestException('Run 2FA setup first');
    if (!authenticator.check(code, row.secret)) {
      throw new BadRequestException('Invalid code');
    }
    // Generate one-time recovery codes (10 × 10 chars). Store hashes.
    const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(5).toString('hex'));
    const hashedCodes = recoveryCodes.map((c) => this.hashToken(c));
    await this.prisma.$transaction([
      this.prisma.twoFactorSecret.update({
        where: { userId },
        data: { recoveryCodes: hashedCodes },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      }),
    ]);
    return { recoveryCodes };
  }

  async disable2FA(userId: string, code: string): Promise<{ message: string }> {
    const row = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!row) throw new BadRequestException('2FA not enabled');
    if (!authenticator.check(code, row.secret)) {
      throw new BadRequestException('Invalid code');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false },
      }),
      this.prisma.twoFactorSecret.delete({ where: { userId } }),
    ]);
    return { message: '2FA disabled' };
  }

  // ───────────────────────────────────────────────────────────────────
  // TOKEN HELPERS
  // ───────────────────────────────────────────────────────────────────

  private async issueTokenPair(user: User, ctx: LoginContext): Promise<TokenPair> {
    const accessTtl = this.config.get<number>('JWT_ACCESS_TTL', 900);
    const refreshTtl = this.config.get<number>('JWT_REFRESH_TTL', 604_800);

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
    await this.prisma.session.create({
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
