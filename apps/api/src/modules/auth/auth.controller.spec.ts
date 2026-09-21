import { Test } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * HTTP-level tests: the real controller, the real Zod DTOs and the real global
 * validation pipe, with only AuthService mocked.
 *
 * Service-level tests can't catch a DTO that rejects valid input — this is the
 * layer where recovery codes were once silently blocked.
 */
describe('AuthController (HTTP)', () => {
  let app: INestApplication;
  const auth = {
    login: jest.fn().mockResolvedValue({ user: { id: 'u1' }, requiresTwoFactor: false }),
    disable2FA: jest.fn().mockResolvedValue({ message: '2FA disabled' }),
    enable2FA: jest.fn().mockResolvedValue({ recoveryCodes: [] }),
    getMe: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Ada Lovelace', role: 'USER' }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ConfigService, useValue: { get: (_k: string, d?: unknown) => d } },
      ],
    })
      // The class-level JwtAuthGuard needs a registered passport strategy; the
      // middleware below supplies req.user instead.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter(true));
    // Stand in for JwtAuthGuard on the authenticated 2FA routes.
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = { id: 'u1', email: 'a@b.com', role: 'USER' };
      next();
    });
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  const login = (twoFactorCode?: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'x', ...(twoFactorCode ? { twoFactorCode } : {}) });

  it('passes a TOTP code through to the service', async () => {
    await login('123456').expect(200);
    expect(auth.login).toHaveBeenCalledWith(
      expect.objectContaining({ twoFactorCode: '123456' }),
      expect.anything(),
    );
  });

  it('passes a recovery code through to the service instead of rejecting it', async () => {
    await login('a1b2c3d4e5').expect(200);
    expect(auth.login).toHaveBeenCalledWith(
      expect.objectContaining({ twoFactorCode: 'a1b2c3d4e5' }),
      expect.anything(),
    );
  });

  it('rejects a malformed code before it reaches the service', async () => {
    const res = await login('zzzz').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('lets a recovery code disable 2FA', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/disable')
      .send({ code: 'a1b2c3d4e5' })
      .expect((r) => expect(r.status).toBeLessThan(300));
    expect(auth.disable2FA).toHaveBeenCalledWith('u1', 'a1b2c3d4e5');
  });

  it('refuses a recovery code when enabling 2FA', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/enable')
      .send({ code: 'a1b2c3d4e5' })
      .expect(400);
    expect(auth.enable2FA).not.toHaveBeenCalled();
  });

  it('/auth/me returns the profile including the name, not just the JWT claims', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(200);
    expect(res.body.user).toMatchObject({ id: 'u1', name: 'Ada Lovelace' });
    expect(auth.getMe).toHaveBeenCalledWith('u1');
  });
});
