import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.manager)
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('pipeline-velocity')
  @Roles(UserRole.manager)
  getPipelineVelocity() {
    return this.analyticsService.getPipelineVelocity();
  }

  @Get('source-performance')
  @Roles(UserRole.manager)
  getSourcePerformance() {
    return this.analyticsService.getSourcePerformance();
  }

  @Get('dropout-analysis')
  @Roles(UserRole.manager)
  getDropoutAnalysis() {
    return this.analyticsService.getDropoutAnalysis();
  }

  @Get('deployment-speed')
  @Roles(UserRole.manager)
  getDeploymentSpeed() {
    return this.analyticsService.getDeploymentSpeed();
  }
}
