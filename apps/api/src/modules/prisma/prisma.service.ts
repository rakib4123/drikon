import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps PrismaClient so it's part of Nest's DI graph
 * and shuts down cleanly on app termination.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
      errorFormat: 'minimal',
    });

    // Surface DB warnings and errors into our log stream.
    // @ts-expect-error — Prisma's event types are loose
    this.$on('warn', (e) => this.logger.warn(e.message));
    // @ts-expect-error — Prisma's event types are loose
    this.$on('error', (e) => this.logger.error(e.message));
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('🐘 Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Truncate everything — destructive, dev only.
   * Used by integration tests between test cases.
   */
  async truncateAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('truncateAll() refused in production');
    }
    const tables = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const names = tables
      .map((t) => `"public"."${t.tablename}"`)
      .filter((n) => !n.includes('_prisma_migrations'))
      .join(', ');
    if (names) {
      await this.$executeRawUnsafe(`TRUNCATE ${names} RESTART IDENTITY CASCADE;`);
    }
  }
}
