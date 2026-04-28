import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ProcessTrackingService } from './process-tracking.service';
import { UpdateStepDto } from './dto/update-step.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('process-tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.process_manager)
export class ProcessTrackingController {
  constructor(private processTrackingService: ProcessTrackingService) {}

  @Get(':candidateJobId')
  getOrInitialize(
    @Param('candidateJobId', ParseIntPipe) candidateJobId: number,
    @CurrentUser() user: any,
  ) {
    return this.processTrackingService.getOrInitialize(candidateJobId, user.id);
  }

  @Put('step/:id')
  updateStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStepDto,
    @CurrentUser() user: any,
  ) {
    return this.processTrackingService.updateStep(id, dto, user.id);
  }
}
