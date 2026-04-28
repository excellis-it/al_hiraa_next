import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.data_entry]: 1,
  [UserRole.recruiter]: 2,
  [UserRole.process_manager]: 3,
  [UserRole.manager]: 4,
  [UserRole.admin]: 5,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Check if user's role is in the required roles or has higher hierarchy
    const userLevel = ROLE_HIERARCHY[user.role as UserRole] || 0;
    return requiredRoles.some((role) => {
      const requiredLevel = ROLE_HIERARCHY[role] || 0;
      return userLevel >= requiredLevel;
    });
  }
}
