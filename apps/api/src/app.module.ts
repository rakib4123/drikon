import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    // Typed, validated env vars available everywhere via ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),

    // Structured request logging with request IDs
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL', 'info'),
          customProps: (req: any) => ({ requestId: req.id }),
          // Redact sensitive headers/fields from logs (audit hygiene)
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.token',
              'req.body.refreshToken',
            ],
            censor: '***REDACTED***',
          },
          transport:
            config.get<string>('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
        },
      }),
    }),

    // Global rate limiting: 100 req / minute per IP by default.
    // Specific endpoints (login, register) tighten this further with @Throttle.
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },         // burst protection
      { name: 'medium', ttl: 60_000, limit: 100 },     // per minute
      { name: 'long', ttl: 3_600_000, limit: 2000 },   // per hour
    ]),

    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    HealthModule,
  ],
  providers: [
    // Apply throttler globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
