import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Password policy — enforced everywhere we accept a password.
 *  - Minimum 10 chars (NIST 800-63B recommends 8+, we go higher)
 *  - At least one lowercase, uppercase, digit
 *  - At least one symbol
 *  - Max 128 (prevents argon2 DoS)
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password too long')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/\d/, 'Must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain a symbol');

export const RegisterSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
});
export class RegisterDto extends createZodDto(RegisterSchema) {}

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
  twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
});
export class LoginDto extends createZodDto(LoginSchema) {}

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}

export const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}

export const VerifyEmailSchema = z.object({
  token: z.string().min(10),
});
export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}

export const Enable2FASchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});
export class Enable2FADto extends createZodDto(Enable2FASchema) {}
