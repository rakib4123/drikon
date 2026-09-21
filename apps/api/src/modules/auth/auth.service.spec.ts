import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { createHash } from 'node:crypto';

import { AuthService } from './auth.service';
import { UserModel } from '../../models/user.model';
import { MailService } from '../mail/mail.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

// Fast argon2 params — these tests exercise control flow, not KDF hardness.
const FAST_ARGON = { ARGON2_MEMORY_COST: 8192, ARGON2_TIME_COST: 2, ARGON2_PARALLELISM: 1 };

describe('AuthService', () => {
  let service: AuthService;
  let users: Record<string, jest.Mock>;
  let passwordHash: string;
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeAll(async () => {
    passwordHash = await argon2.hash('correct-horse', {
      type: argon2.argon2id, memoryCost: 8192, timeCost: 2, parallelism: 1,
    });
  });

  beforeEach(async () => {
    jwt = { signAsync: jest.fn().mockResolvedValue('tok'), verifyAsync: jest.fn() };
    users = {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      createSession: jest.fn().mockResolvedValue({}),
      findTwoFactorSecret: jest.fn(),
      consumeRecoveryCode: jest.fn().mockResolvedValue(true),
      disableTwoFactorTransaction: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn(),
      create: jest.fn(),
      recordLoginFailure: jest.fn().mockResolvedValue(1),
      lockLoginFromIp: jest.fn().mockResolvedValue({}),
      isLoginLockedFromIp: jest.fn().mockResolvedValue(false),
      recentLoginFailures: jest.fn().mockResolvedValue(1),
      clearLoginFailures: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserModel, useValue: users },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string, d?: unknown) => (FAST_ARGON as Record<string, unknown>)[k] ?? d,
            getOrThrow: () => 'a'.repeat(40),
          },
        },
        { provide: MailService, useValue: { sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  function userWith2FA(secret: string, recoveryCodes: string[] = []) {
    return {
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER,
      passwordHash, authProvider: AuthProvider.LOCAL,
      failedLoginAttempts: 0, lockedUntil: null,
      twoFactorEnabled: true,
      twoFactorSecret: { secret, recoveryCodes },
    };
  }

  describe('login — second factor', () => {
    it('asks for a second factor before issuing tokens', async () => {
      users.findUnique.mockResolvedValue(userWith2FA(authenticator.generateSecret()));

      const result = await service.login({ email: 'a@b.com', password: 'correct-horse' }, {});

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.tokens).toBeUndefined();
    });

    it('accepts a valid TOTP code', async () => {
      const secret = authenticator.generateSecret();
      users.findUnique.mockResolvedValue(userWith2FA(secret));

      const result = await service.login(
        { email: 'a@b.com', password: 'correct-horse', twoFactorCode: authenticator.generate(secret) },
        {},
      );

      expect(result.tokens).toBeDefined();
    });

    it('accepts an unused recovery code in place of a TOTP code', async () => {
      const secret = authenticator.generateSecret();
      users.findUnique.mockResolvedValue(userWith2FA(secret, [sha256('abcdef1234')]));

      const result = await service.login(
        { email: 'a@b.com', password: 'correct-horse', twoFactorCode: 'abcdef1234' },
        {},
      );

      expect(result.tokens).toBeDefined();
      expect(users.consumeRecoveryCode).toHaveBeenCalledWith('u1', sha256('abcdef1234'));
    });

    it('is case-insensitive about a recovery code', async () => {
      const secret = authenticator.generateSecret();
      users.findUnique.mockResolvedValue(userWith2FA(secret, [sha256('abcdef1234')]));

      const result = await service.login(
        { email: 'a@b.com', password: 'correct-horse', twoFactorCode: 'ABCDEF1234' },
        {},
      );
      expect(result.tokens).toBeDefined();
    });

    it('rejects a recovery code that was already spent', async () => {
      const secret = authenticator.generateSecret();
      users.findUnique.mockResolvedValue(userWith2FA(secret, [sha256('abcdef1234')]));
      // Lost the race — another login burned it first.
      users.consumeRecoveryCode.mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@b.com', password: 'correct-horse', twoFactorCode: 'abcdef1234' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a code that is neither a valid TOTP nor a known recovery code', async () => {
      users.findUnique.mockResolvedValue(userWith2FA(authenticator.generateSecret(), [sha256('abcdef1234')]));

      await expect(
        service.login({ email: 'a@b.com', password: 'correct-horse', twoFactorCode: '000000' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.consumeRecoveryCode).not.toHaveBeenCalled();
    });
  });

  describe('login — credentials', () => {
    it('rejects a wrong password', async () => {
      users.findUnique.mockResolvedValue({
        id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER,
        passwordHash, failedLoginAttempts: 0, lockedUntil: null, twoFactorEnabled: false,
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('gives the same error for an unknown account as for a wrong password', async () => {
      users.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@b.com', password: 'x' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('refuses a locked account even with the right password', async () => {
      users.findUnique.mockResolvedValue({
        id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER,
        passwordHash, failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 60_000), twoFactorEnabled: false,
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'correct-horse' }, {}),
      ).rejects.toThrow(/locked/i);
    });

    it('counts a failed attempt towards the lockout threshold', async () => {
      users.findUnique.mockResolvedValue({
        id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER,
        passwordHash, failedLoginAttempts: 3, lockedUntil: null, twoFactorEnabled: false,
      });

      await expect(service.login({ email: 'a@b.com', password: 'nope' }, {})).rejects.toThrow();
      expect(users.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 4 }) }),
      );
    });
  });

  describe('disable2FA', () => {
    it('accepts a recovery code, so a lost authenticator is not a dead end', async () => {
      users.findTwoFactorSecret.mockResolvedValue({
        secret: authenticator.generateSecret(),
        recoveryCodes: [sha256('abcdef1234')],
      });

      await expect(service.disable2FA('u1', 'abcdef1234')).resolves.toEqual({ message: '2FA disabled' });
      expect(users.disableTwoFactorTransaction).toHaveBeenCalledWith('u1');
    });

    it('rejects a bogus code', async () => {
      users.findTwoFactorSecret.mockResolvedValue({
        secret: authenticator.generateSecret(),
        recoveryCodes: [],
      });

      await expect(service.disable2FA('u1', '000000')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('login — failed second factor counts toward lockout', () => {
    it('increments failedLoginAttempts on a wrong 2FA code', async () => {
      users.findUnique.mockResolvedValue({ ...userWith2FA(authenticator.generateSecret()), failedLoginAttempts: 2 });

      await expect(
        service.login({ email: 'a@b.com', password: 'correct-horse', twoFactorCode: '000000' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 3 }) }),
      );
    });
  });

  describe('loginWithGoogle', () => {
    const google = (over: Record<string, unknown> = {}) => ({
      googleId: 'g1', email: 'a@b.com', name: 'A', emailVerified: true, ...over,
    });

    it('refuses an email Google has not verified — it would auto-link to an existing account', async () => {
      await expect(service.loginWithGoogle(google({ emailVerified: false }) as never, {})).rejects.toMatchObject({
        reason: 'unverified_email',
      });
      expect(users.findFirst).not.toHaveBeenCalled();
    });

    it('refuses a locked account', async () => {
      users.findFirst.mockResolvedValue({
        id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, googleId: 'g1',
        lockedUntil: new Date(Date.now() + 60_000), twoFactorEnabled: false, twoFactorSecret: null,
      });
      await expect(service.loginWithGoogle(google() as never, {})).rejects.toMatchObject({ reason: 'locked' });
    });

    it('does not hand out a session to a 2FA account — it asks for the code instead', async () => {
      users.findFirst.mockResolvedValue({
        ...userWith2FA(authenticator.generateSecret()), googleId: 'g1',
      });

      const result = await service.loginWithGoogle(google() as never, {});

      expect(result.tokens).toBeUndefined();
      expect(result.requiresTwoFactor).toBe(true);
      expect(result.twoFactorPendingToken).toBe('tok');
      expect(users.createSession).not.toHaveBeenCalled();
    });

    it('issues a session straight away when 2FA is off', async () => {
      users.findFirst.mockResolvedValue({
        id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, googleId: 'g1',
        lockedUntil: null, twoFactorEnabled: false, twoFactorSecret: null,
      });
      const result = await service.loginWithGoogle(google() as never, {});
      expect(result.tokens).toBeDefined();
    });
  });

  describe('verifyPendingTwoFactor', () => {
    it('completes the sign-in with a valid code', async () => {
      const secret = authenticator.generateSecret();
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: '2fa_pending' });
      users.findUnique.mockResolvedValue(userWith2FA(secret));

      const result = await service.verifyPendingTwoFactor('pending', authenticator.generate(secret), {});
      expect(result.tokens).toBeDefined();
    });

    it('rejects a wrong code and counts it toward lockout', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: '2fa_pending' });
      users.findUnique.mockResolvedValue(userWith2FA(authenticator.generateSecret()));

      await expect(service.verifyPendingTwoFactor('pending', '000000', {})).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 1 }) }),
      );
    });

    it('rejects an access token passed off as a pending token', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: 'access' });
      await expect(service.verifyPendingTwoFactor('x', '123456', {})).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.findUnique).not.toHaveBeenCalled();
    });

    it('rejects an expired pending token', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(service.verifyPendingTwoFactor('x', '123456', {})).rejects.toThrow(/expired/i);
    });
  });

  describe('lockout — per IP, not per account', () => {
    const plainUser = (over: Record<string, unknown> = {}) => ({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER,
      passwordHash, failedLoginAttempts: 0, lockedUntil: null, twoFactorEnabled: false, ...over,
    });

    it('locks the account from the guessing IP only, once that IP hits the threshold', async () => {
      users.findUnique.mockResolvedValue(plainUser());
      users.recordLoginFailure.mockResolvedValue(5); // 5th failure from this IP
      users.recentLoginFailures.mockResolvedValue(5); // far below the account-wide 50

      await expect(service.login({ email: 'a@b.com', password: 'nope' }, { ipAddress: '1.2.3.4' })).rejects.toThrow();

      expect(users.lockLoginFromIp).toHaveBeenCalledWith('u1', '1.2.3.4', expect.any(Date));
      // The account itself stays usable for its owner elsewhere.
      const data = users.update.mock.calls.at(-1)[0].data;
      expect(data.lockedUntil).toBeUndefined();
    });

    it('lets the owner in from another IP while one IP is locked out', async () => {
      users.findUnique.mockResolvedValue(plainUser());
      users.isLoginLockedFromIp.mockImplementation(async (_u: string, ip: string) => ip === '6.6.6.6');

      await expect(service.login({ email: 'a@b.com', password: 'correct-horse' }, { ipAddress: '6.6.6.6' })).rejects.toThrow(/locked/i);
      const ok = await service.login({ email: 'a@b.com', password: 'correct-horse' }, { ipAddress: '9.9.9.9' });
      expect(ok.tokens).toBeDefined();
    });

    it('still locks the whole account when failures pile up across many IPs', async () => {
      users.findUnique.mockResolvedValue(plainUser());
      users.recordLoginFailure.mockResolvedValue(1);
      users.recentLoginFailures.mockResolvedValue(50);

      await expect(service.login({ email: 'a@b.com', password: 'nope' }, { ipAddress: '5.5.5.5' })).rejects.toThrow();
      expect(users.update.mock.calls.at(-1)[0].data.lockedUntil).toBeInstanceOf(Date);
    });

    it('clears this IP\'s failure record on a successful sign-in', async () => {
      users.findUnique.mockResolvedValue(plainUser());
      await service.login({ email: 'a@b.com', password: 'correct-horse' }, { ipAddress: '1.2.3.4' });
      expect(users.clearLoginFailures).toHaveBeenCalledWith('u1', '1.2.3.4');
    });
  });
});
