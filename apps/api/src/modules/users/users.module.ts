import { Module } from '@nestjs/common';
import { Controller, Get, Patch, Body } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators';

// ─── DTO ───
const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/).optional(),
  avatarUrl: z.string().url().optional(),
});
class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}

// ─── Service ───
@Injectable()
class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true,
        role: true, emailVerified: true, twoFactorEnabled: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true,
      },
    });
  }
}

// ─── Controller ───
@ApiTags('users')
@Controller({ path: 'users', version: '1' })
class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(user.id, dto);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
