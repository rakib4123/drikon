import { Disable2FASchema, Enable2FASchema, LoginSchema } from './auth.dto';

/**
 * Validation runs before AuthService, so a service-level test can pass while the
 * real endpoint rejects the input. That is exactly how recovery codes shipped
 * broken once: the service accepted them, the DTO never let them through.
 */
describe('auth DTOs — second factor', () => {
  const login = (twoFactorCode: string) =>
    LoginSchema.safeParse({ email: 'a@b.com', password: 'x', twoFactorCode });

  it('login accepts a 6-digit TOTP code', () => {
    expect(login('123456').success).toBe(true);
  });

  it('login accepts a 10-character recovery code', () => {
    expect(login('a1b2c3d4e5').success).toBe(true);
  });

  it('login accepts an uppercase recovery code and trims whitespace', () => {
    const r = login('  A1B2C3D4E5 ');
    expect(r.success).toBe(true);
    expect(r.success && r.data.twoFactorCode).toBe('A1B2C3D4E5');
  });

  it('login rejects codes of any other shape', () => {
    for (const bad of ['12345', '1234567', 'zzzzzzzzzz', 'a1b2c3d4e', '12345678901']) {
      expect(login(bad).success).toBe(false);
    }
  });

  it('login still works with no second factor at all', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('disabling 2FA accepts a recovery code', () => {
    expect(Disable2FASchema.safeParse({ code: 'a1b2c3d4e5' }).success).toBe(true);
  });

  it('enabling 2FA only accepts a live TOTP code — no recovery codes exist yet', () => {
    expect(Enable2FASchema.safeParse({ code: '123456' }).success).toBe(true);
    expect(Enable2FASchema.safeParse({ code: 'a1b2c3d4e5' }).success).toBe(false);
  });
});
