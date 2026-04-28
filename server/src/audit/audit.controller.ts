import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma';

@Controller('activity-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('entity_type') entity_type?: string,
    @Query('user_id') user_id?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.findAll({
      page: +page,
      limit: +limit,
      entity_type,
      user_id,
      action,
    });
  }
}
