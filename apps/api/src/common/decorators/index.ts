import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Extracts the authenticated user from the request.
 *
 * Usage:
 *   @Get('me')
 *   me(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): unknown => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) return null;
    return data ? user[data] : user;
  },
);

/**
 * Marks a route as public — JwtAuthGuard will skip it.
 *
 * Usage:
 *   @Public()
 *   @Get('products')
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Role gate. Requires one of the listed roles.
 *
 * Usage:
 *   @Roles(Role.ADMIN, Role.SUPER_ADMIN)
 *   @Post()
 *   create(...) { ... }
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
