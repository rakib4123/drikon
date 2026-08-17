import { Injectable } from '@nestjs/common';
import { SettingsModel } from '../../models/settings.model';
import type { UpdateSettingsDto } from './dto/settings.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private readonly settings: SettingsModel) {}

  /** Always returns the one settings row, creating defaults on first read. */
  async get() {
    return this.settings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
  }

  /** Admin update. Empty strings clear optional fields (stored as null). */
  async update(dto: UpdateSettingsDto) {
    const data = Object.fromEntries(
      Object.entries(dto).map(([k, v]) => [k, v === '' ? null : v]),
    );
    return this.settings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
  }
}
