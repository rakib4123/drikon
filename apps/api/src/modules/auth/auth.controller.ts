import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { CurrentUser, Public, AuthenticatedUser } from '../../common/decorators';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  Enable2FADto,
} from './dto/auth.dto';
import type { TokenPair } from './interfaces/jwt.interface';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Helper: write tokens to httpOnly cookies ───
  private setAuthCookies(res: Response, tokens: TokenPair): void {
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL') ?? 900);
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL') ?? 604_800);
    const secure = this.config.get<boolean>('COOKIE_SECURE', false);
    const domain = this.config.get<string>('COOKIE_DOMAIN') || undefined;

    const common = {
      httpOnly: true,
      secure,
      sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
      domain,
      signed: true,
      path: '/',
    };

    res.cookie('drikon_access', tokens.accessToken, {
      ...common,
      maxAge: accessTtl * 1000,
    });
    res.cookie('drikon_refresh', tokens.refreshToken, {
      ...common,
      maxAge: refreshTtl * 1000,
      // Refresh cookie scoped to the refresh endpoint only — defence in depth.
      path: '/api/v1/auth',
    });
  }

  private clearAuthCookies(res: Response): void {
    const domain = this.config.get<string>('COOKIE_DOMAIN') || undefined;
    res.clearCookie('drikon_access', { domain, path: '/' });
    res.clearCookie('drikon_refresh', { domain, path: '/api/v1/auth' });
  }

  // ───────────────────────────────────────────────────────────
  // REGISTER
  // ───────────────────────────────────────────────────────────
  @Public()
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60_000 } }) // 3 registrations / minute / IP
  @ApiOperation({ summary: 'Create a new account and send verification email' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email via token from email' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  // ───────────────────────────────────────────────────────────
  // LOGIN
  // ───────────────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60_000 } }) // 5 attempts / minute / IP (app also locks per-account)
  @ApiOperation({ summary: 'Authenticate with email + password (+ optional 2FA code)' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (result.tokens) this.setAuthCookies(res, result.tokens);
    // Don't return tokens in body — they're in httpOnly cookies.
    return {
      user: result.user,
      requiresTwoFactor: result.requiresTwoFactor ?? false,
    };
  }

  // ───────────────────────────────────────────────────────────
  // REFRESH (cookie-driven; no body needed)
  // ───────────────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token; issue new access + refresh' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken: string | undefined =
      req.signedCookies?.['drikon_refresh'] ?? req.cookies?.['drikon_refresh'];
    if (!refreshToken) {
      this.clearAuthCookies(res);
      return { success: false };
    }
    const tokens = await this.authService.refresh(refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.setAuthCookies(res, tokens);
    return { success: true };
  }

  // ───────────────────────────────────────────────────────────
  // LOGOUT
  // ───────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout this session' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken: string | undefined =
      req.signedCookies?.['drikon_refresh'] ?? req.cookies?.['drikon_refresh'];
    const result = await this.authService.logout(refreshToken);
    this.clearAuthCookies(res);
    return result;
  }

  @Post('logout-everywhere')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions for current user' })
  async logoutEverywhere(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutEverywhere(user.id);
    this.clearAuthCookies(res);
    return result;
  }

  // ───────────────────────────────────────────────────────────
  // ME
  // ───────────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  // ───────────────────────────────────────────────────────────
  // GOOGLE OAUTH
  // ───────────────────────────────────────────────────────────
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Begin Google OAuth flow' })
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleLogin() {}

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.loginWithGoogle(req.user as any, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (result.tokens) this.setAuthCookies(res, result.tokens);
    // Redirect to frontend
    const webOrigin = this.config.get<string>('WEB_ORIGIN', 'http://localhost:3000').split(',')[0];
    return res.redirect(`${webOrigin}/dashboard`);
  }

  // ───────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ───────────────────────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto.email, req.ip);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // ───────────────────────────────────────────────────────────
  // 2FA
  // ───────────────────────────────────────────────────────────
  @Post('2fa/setup')
  @ApiOperation({ summary: 'Generate 2FA secret + QR code (does not enable yet)' })
  async setup2FA(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setup2FA(user.id);
  }

  @Post('2fa/enable')
  @ApiOperation({ summary: 'Confirm 2FA setup with a TOTP code; returns recovery codes' })
  async enable2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Enable2FADto,
  ) {
    return this.authService.enable2FA(user.id, dto.code);
  }

  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA (requires current TOTP code)' })
  async disable2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Enable2FADto,
  ) {
    return this.authService.disable2FA(user.id, dto.code);
  }
}
