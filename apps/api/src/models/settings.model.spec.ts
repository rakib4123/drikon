import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { SettingsModel } from './settings.model';

describe('SettingsModel', () => {
  let model: SettingsModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = { siteSettings: { upsert: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(SettingsModel);
  });

  it('upsert delegates to prisma.siteSettings.upsert', async () => {
    prisma.siteSettings.upsert.mockResolvedValue({ id: 'singleton' });
    const args = { where: { id: 'singleton' }, create: { id: 'singleton' }, update: {} };
    await expect(model.upsert(args as any)).resolves.toEqual({ id: 'singleton' });
    expect(prisma.siteSettings.upsert).toHaveBeenCalledWith(args);
  });
});
