import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class UserModel {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User ───

  findUnique<T extends Prisma.UserFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>) {
    return this.prisma.user.findUnique(args);
  }

  findFirst<T extends Prisma.UserFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>) {
    return this.prisma.user.findFirst(args);
  }

  findUniqueOrThrow<T extends Prisma.UserFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, Prisma.UserFindUniqueOrThrowArgs>) {
    return this.prisma.user.findUniqueOrThrow(args);
  }

  create<T extends Prisma.UserCreateArgs>(args: Prisma.SelectSubset<T, Prisma.UserCreateArgs>) {
    return this.prisma.user.create(args);
  }

  update<T extends Prisma.UserUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>) {
    return this.prisma.user.update(args);
  }

  count<T extends Prisma.UserCountArgs>(args: Prisma.SelectSubset<T, Prisma.UserCountArgs>) {
    return this.prisma.user.count(args);
  }

  findManyAndCount<T extends Prisma.UserFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>,
    countArgs: Prisma.UserCountArgs,
  ) {
    return this.prisma.$transaction([
      this.prisma.user.findMany(args),
      this.prisma.user.count(countArgs),
    ]);
  }

  // ─── Email verification ───

  createVerificationToken<T extends Prisma.VerificationTokenCreateArgs>(args: Prisma.SelectSubset<T, Prisma.VerificationTokenCreateArgs>) {
    return this.prisma.verificationToken.create(args);
  }

  findVerificationToken(tokenHash: string) {
    return this.prisma.verificationToken.findUnique({ where: { tokenHash } });
  }

  /** Atomically marks the user verified and the token used. */
  consumeVerificationToken(tokenId: string, userId: string) {
    return this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
      this.prisma.verificationToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
    ]);
  }

  // ─── Password reset ───

  createPasswordResetToken<T extends Prisma.PasswordResetTokenCreateArgs>(args: Prisma.SelectSubset<T, Prisma.PasswordResetTokenCreateArgs>) {
    return this.prisma.passwordResetToken.create(args);
  }

  findPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  /** Atomically sets the new password, marks the token used, and revokes every session. */
  resetPasswordTransaction(tokenId: string, userId: string, passwordHash: string) {
    return this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
  }

  // ─── Sessions ───

  findSessionByRefreshHash(tokenHash: string) {
    return this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });
  }

  createSession<T extends Prisma.SessionCreateArgs>(args: Prisma.SelectSubset<T, Prisma.SessionCreateArgs>) {
    return this.prisma.session.create(args);
  }

  deleteSession(id: string) {
    return this.prisma.session.delete({ where: { id } });
  }

  deleteSessionsForUser(userId: string) {
    return this.prisma.session.deleteMany({ where: { userId } });
  }

  deleteSessionsByRefreshHash(tokenHash: string) {
    return this.prisma.session.deleteMany({ where: { refreshTokenHash: tokenHash } });
  }

  // ─── Login failures (per account + IP) ───

  /**
   * Counts one failed sign-in for this account from this IP, restarting the
   * count once the window has passed. One statement, so parallel guesses can't
   * race past the threshold. Returns the count inside the current window.
   */
  async recordLoginFailure(userId: string, ipAddress: string, windowSeconds: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "LoginFailure" ("id", "userId", "ipAddress", "count", "windowStart")
      VALUES (gen_random_uuid()::text, ${userId}, ${ipAddress}, 1, NOW())
      ON CONFLICT ("userId", "ipAddress") DO UPDATE SET
        "count" = CASE WHEN "LoginFailure"."windowStart" < NOW() - make_interval(secs => ${windowSeconds})
                       THEN 1 ELSE "LoginFailure"."count" + 1 END,
        "windowStart" = CASE WHEN "LoginFailure"."windowStart" < NOW() - make_interval(secs => ${windowSeconds})
                             THEN NOW() ELSE "LoginFailure"."windowStart" END
      RETURNING "count"
    `;
    return rows[0].count;
  }

  lockLoginFromIp(userId: string, ipAddress: string, until: Date) {
    return this.prisma.loginFailure.update({
      where: { userId_ipAddress: { userId, ipAddress } },
      data: { lockedUntil: until },
    });
  }

  async isLoginLockedFromIp(userId: string, ipAddress: string): Promise<boolean> {
    const row = await this.prisma.loginFailure.findUnique({
      where: { userId_ipAddress: { userId, ipAddress } },
      select: { lockedUntil: true },
    });
    return !!row?.lockedUntil && row.lockedUntil > new Date();
  }

  /** Failures against this account from every IP within the window — the account-wide signal. */
  async recentLoginFailures(userId: string, windowSeconds: number): Promise<number> {
    const agg = await this.prisma.loginFailure.aggregate({
      where: { userId, windowStart: { gt: new Date(Date.now() - windowSeconds * 1000) } },
      _sum: { count: true },
    });
    return agg._sum.count ?? 0;
  }

  clearLoginFailures(userId: string, ipAddress: string) {
    return this.prisma.loginFailure.deleteMany({ where: { userId, ipAddress } });
  }

  // ─── Two-factor (TOTP) ───

  upsertTwoFactorSecret<T extends Prisma.TwoFactorSecretUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.TwoFactorSecretUpsertArgs>) {
    return this.prisma.twoFactorSecret.upsert(args);
  }

  findTwoFactorSecret(userId: string) {
    return this.prisma.twoFactorSecret.findUnique({ where: { userId } });
  }

  /** Atomically stores the recovery codes and flips twoFactorEnabled on. */
  enableTwoFactorTransaction(userId: string, hashedRecoveryCodes: string[]) {
    return this.prisma.$transaction([
      this.prisma.twoFactorSecret.update({ where: { userId }, data: { recoveryCodes: hashedRecoveryCodes } }),
      this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } }),
    ]);
  }

  /**
   * Burns a single recovery code. The `has` filter makes the read and the write
   * one statement, so the same code can't be redeemed twice concurrently.
   */
  async consumeRecoveryCode(userId: string, hashedCode: string): Promise<boolean> {
    // array_remove drops just the one code. Prisma's scalar-list update can only
    // `set` the whole array, which would burn every remaining code at once.
    const affected = await this.prisma.$executeRaw`
      UPDATE "TwoFactorSecret"
         SET "recoveryCodes" = array_remove("recoveryCodes", ${hashedCode})
       WHERE "userId" = ${userId}
         AND ${hashedCode} = ANY("recoveryCodes")
    `;
    return affected > 0;
  }

  /** Atomically flips twoFactorEnabled off and deletes the secret. */
  disableTwoFactorTransaction(userId: string) {
    return this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } }),
      this.prisma.twoFactorSecret.delete({ where: { userId } }),
    ]);
  }
}
