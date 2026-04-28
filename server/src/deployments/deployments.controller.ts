import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('deployments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.process_manager)
export class DeploymentsController {
  constructor(private deploymentsService: DeploymentsService) {}

  @Get('summary')
  getSummary() {
    return this.deploymentsService.getSummary();
  }

  @Get('expiring-soon')
  @UseGuards(RolesGuard)
  @Roles(UserRole.manager)
  getExpiringSoon(@Query('days') days = '30') {
    return this.deploymentsService.getExpiringSoon(+days);
  }

  @Post('notify-expiry')
  @UseGuards(RolesGuard)
  @Roles(UserRole.manager)
  sendExpiryNotifications() {
    return this.deploymentsService.sendExpiryNotifications();
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('company_id') company_id?: string,
    @Query('expiring_days') expiring_days?: string,
  ) {
    return this.deploymentsService.findAll({
      page: +page,
      limit: +limit,
      search,
      status,
      company_id: company_id ? +company_id : undefined,
      expiring_days: expiring_days ? +expiring_days : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deploymentsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.process_manager)
  create(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.deploymentsService.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.process_manager)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.deploymentsService.update(id, dto);
  }
}
