import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleUserPayload {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  /** Whether Google has verified the account owns this email. */
  emailVerified: boolean;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: config.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:4000/api/v1/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const primary = profile.emails?.[0];
    const email = primary?.value;
    if (!email) return done(new Error('Google account has no email'), undefined);
    // passport-google-oauth20 exposes this in two places depending on version.
    const raw = (primary as { verified?: boolean | string } | undefined)?.verified
      ?? (profile as { _json?: { email_verified?: boolean | string } })._json?.email_verified;
    const emailVerified = raw === true || raw === 'true';
    const payload: GoogleUserPayload = {
      googleId: profile.id,
      email: email.toLowerCase(),
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
      emailVerified,
    };
    done(null, payload);
  }
}
