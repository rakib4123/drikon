/**
 * Drikon API — Bootstrap
 *
 * Everything that protects us from the internet starts here:
 *   - Helmet security headers (CSP, HSTS, XFO, etc.)
 *   - Strict CORS (whitelist + credentials)
 *   - Global validation (Zod via nestjs-zod)
 *   - Cookie parser (for httpOnly auth cookies)
 *   - Global exception filter (no stack traces leaked)
 *   - Pino structured logging with request IDs
 *   - Swagger docs (dev only)
 *   - Graceful shutdown
 */
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Replace default logger with Pino for structured JSON logs in prod.
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 4000);
  const host = config.get<string>('API_HOST', '0.0.0.0');
  const webOrigins = config
    .get<string>('WEB_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  // ───── Trust proxy (Cloudflare / load balancer in front of us) ─────
  // Required so req.ip reflects the real client IP, not the proxy's.
  app.set('trust proxy', 1);

  // ───── Disable the "X-Powered-By: Express" header ─────
  // Don't volunteer fingerprintable info to attackers.
  app.disable('x-powered-by');

  // ───── Helmet: HTTP security headers ─────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // We don't serve scripts from the API. If you ever do, prefer nonces.
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline styles
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"], // anti-clickjacking
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // we serve images/CDN content
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProduction
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  // ───── Cookies (parse httpOnly auth cookies) ─────
  app.use(cookieParser(config.get<string>('JWT_ACCESS_SECRET')));

  // ───── Request ID middleware ─────
  // Tag every request with an ID so we can trace across logs/services.
  app.use((req: any, res: any, next: any) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });

  // ───── CORS — strict whitelist + credentials for cookie auth ─────
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (webOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });

  // ───── Global API versioning: /v1/... ─────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // ───── Global validation ─────
  // Use nestjs-zod's validation pipe so our Zod DTOs are actually enforced.
  app.useGlobalPipes(new ZodValidationPipe());

  // ───── Global exception filter ─────
  // Catches anything that escaped, logs it, returns a clean JSON error.
  // No stack traces leaked in production.
  app.useGlobalFilters(new AllExceptionsFilter(isProduction));

  // ───── Global response interceptor ─────
  // Wraps every successful response in { success, data, requestId }.
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ───── Swagger docs (dev only) ─────
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Drikon API')
      .setDescription('Drikon — vision, engineered. Internal API documentation.')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('drikon_access')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ───── Graceful shutdown ─────
  app.enableShutdownHooks();

  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`🚀 Drikon API running on http://${host}:${port}`);
  if (!isProduction) {
    // eslint-disable-next-line no-console
    console.log(`📚 Swagger docs at http://${host}:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
