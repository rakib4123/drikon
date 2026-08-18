import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { UserModel } from './user.model';

describe('UserModel', () => {
  let model: UserModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      verificationToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      session: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
      twoFactorSecret: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(UserModel);
  });

  it('findUnique delegates to prisma.user.findUnique', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await expect(model.findUnique({ where: { id: 'u1' } } as any)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('findFirst delegates to prisma.user.findFirst', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
    const args = { where: { OR: [{ googleId: 'g1' }, { email: 'a@b.com' }] } };
    await expect(model.findFirst(args as any)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(args);
  });

  it('findUniqueOrThrow delegates to prisma.user.findUniqueOrThrow', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1' });
    await expect(model.findUniqueOrThrow({ where: { id: 'u1' } } as any)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('create delegates to prisma.user.create', async () => {
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    const args = { data: { email: 'a@b.com', name: 'A' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.user.update', async () => {
    prisma.user.update.mockResolvedValue({ id: 'u1' });
    const args = { where: { id: 'u1' }, data: { lastLoginAt: new Date() } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.update).toHaveBeenCalledWith(args);
  });

  it('count delegates to prisma.user.count', async () => {
    prisma.user.count.mockResolvedValue(42);
    await expect(model.count({ where: { role: 'ADMIN' } } as any)).resolves.toBe(42);
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'ADMIN' } });
  });

  it('findManyAndCount runs findMany + count inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 'u1' }], 1]);
    const args = { where: { role: 'ADMIN' } };
    const countArgs = { where: { role: 'ADMIN' } };
    await model.findManyAndCount(args as any, countArgs as any);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith(args);
    expect(prisma.user.count).toHaveBeenCalledWith(countArgs);
  });

  it('createVerificationToken delegates to prisma.verificationToken.create', async () => {
    prisma.verificationToken.create.mockResolvedValue({ id: 'vt1' });
    const args = { data: { userId: 'u1', tokenHash: 'h', expiresAt: new Date() } };
    await expect(model.createVerificationToken(args as any)).resolves.toEqual({ id: 'vt1' });
    expect(prisma.verificationToken.create).toHaveBeenCalledWith(args);
  });

  it('findVerificationToken looks up by tokenHash', async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({ id: 'vt1' });
    await expect(model.findVerificationToken('h')).resolves.toEqual({ id: 'vt1' });
    expect(prisma.verificationToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'h' } });
  });

  it('consumeVerificationToken marks the user verified and the token used inside one transaction', async () => {
    prisma.$transaction.mockResolvedValue([{ id: 'u1' }, { id: 'vt1' }]);
    await model.consumeVerificationToken('vt1', 'u1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerified: expect.any(Date) },
    });
    expect(prisma.verificationToken.update).toHaveBeenCalledWith({
      where: { id: 'vt1' },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('createPasswordResetToken delegates to prisma.passwordResetToken.create', async () => {
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'pr1' });
    const args = { data: { userId: 'u1', tokenHash: 'h', expiresAt: new Date() } };
    await expect(model.createPasswordResetToken(args as any)).resolves.toEqual({ id: 'pr1' });
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(args);
  });

  it('findPasswordResetToken looks up by tokenHash', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 'pr1' });
    await expect(model.findPasswordResetToken('h')).resolves.toEqual({ id: 'pr1' });
    expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'h' } });
  });

  it('resetPasswordTransaction updates the password, consumes the token, and revokes sessions in one transaction', async () => {
    prisma.$transaction.mockResolvedValue([{ id: 'u1' }, { id: 'pr1' }, { count: 2 }]);
    await model.resetPasswordTransaction('pr1', 'u1', 'hashed');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'hashed', failedLoginAttempts: 0, lockedUntil: null },
    });
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: 'pr1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('findSessionByRefreshHash looks up the session with its user', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 's1', user: { id: 'u1' } });
    await expect(model.findSessionByRefreshHash('h')).resolves.toEqual({ id: 's1', user: { id: 'u1' } });
    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { refreshTokenHash: 'h' },
      include: { user: true },
    });
  });

  it('createSession delegates to prisma.session.create', async () => {
    prisma.session.create.mockResolvedValue({ id: 's1' });
    const args = { data: { id: 's1', userId: 'u1', refreshTokenHash: 'h', expiresAt: new Date() } };
    await expect(model.createSession(args as any)).resolves.toEqual({ id: 's1' });
    expect(prisma.session.create).toHaveBeenCalledWith(args);
  });

  it('deleteSession delegates to prisma.session.delete', async () => {
    prisma.session.delete.mockResolvedValue({ id: 's1' });
    await expect(model.deleteSession('s1')).resolves.toEqual({ id: 's1' });
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('deleteSessionsForUser delegates to prisma.session.deleteMany by userId', async () => {
    prisma.session.deleteMany.mockResolvedValue({ count: 3 });
    await expect(model.deleteSessionsForUser('u1')).resolves.toEqual({ count: 3 });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('deleteSessionsByRefreshHash delegates to prisma.session.deleteMany by refreshTokenHash', async () => {
    prisma.session.deleteMany.mockResolvedValue({ count: 1 });
    await expect(model.deleteSessionsByRefreshHash('h')).resolves.toEqual({ count: 1 });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { refreshTokenHash: 'h' } });
  });

  it('upsertTwoFactorSecret delegates to prisma.twoFactorSecret.upsert', async () => {
    prisma.twoFactorSecret.upsert.mockResolvedValue({ userId: 'u1' });
    const args = { where: { userId: 'u1' }, create: { userId: 'u1', secret: 's', recoveryCodes: [] }, update: {} };
    await expect(model.upsertTwoFactorSecret(args as any)).resolves.toEqual({ userId: 'u1' });
    expect(prisma.twoFactorSecret.upsert).toHaveBeenCalledWith(args);
  });

  it('findTwoFactorSecret looks up by userId', async () => {
    prisma.twoFactorSecret.findUnique.mockResolvedValue({ userId: 'u1', secret: 's' });
    await expect(model.findTwoFactorSecret('u1')).resolves.toEqual({ userId: 'u1', secret: 's' });
    expect(prisma.twoFactorSecret.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('enableTwoFactorTransaction stores recovery codes and flips twoFactorEnabled in one transaction', async () => {
    prisma.$transaction.mockResolvedValue([{ userId: 'u1' }, { id: 'u1' }]);
    await model.enableTwoFactorTransaction('u1', ['h1', 'h2']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.twoFactorSecret.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { recoveryCodes: ['h1', 'h2'] },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { twoFactorEnabled: true } });
  });

  it('disableTwoFactorTransaction flips twoFactorEnabled off and deletes the secret in one transaction', async () => {
    prisma.$transaction.mockResolvedValue([{ id: 'u1' }, { userId: 'u1' }]);
    await model.disableTwoFactorTransaction('u1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { twoFactorEnabled: false } });
    expect(prisma.twoFactorSecret.delete).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});
