import { Injectable } from '@nestjs/common';
import { UserModel } from '../../models/user.model';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly users: UserModel) {}

  async getProfile(userId: string) {
    return this.users.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true,
        role: true, emailVerified: true, twoFactorEnabled: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.users.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true,
      },
    });
  }
}
