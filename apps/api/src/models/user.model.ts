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

  /** Atomically flips twoFactorEnabled off and deletes the secret. */
  disableTwoFactorTransaction(userId: string) {
    return this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } }),
      this.prisma.twoFactorSecret.delete({ where: { userId } }),
    ]);
  }
}
