import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InterviewCheckinsService } from './interview-checkins.service';
import { UpdateCheckinDto } from './dto/update-checkin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('interview-checkins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.recruiter)
export class InterviewCheckinsController {
  constructor(private interviewCheckinsService: InterviewCheckinsService) {}

  @Get()
  findByEvent(@Query('event_id') event_id: string) {
    return this.interviewCheckinsService.findByEvent(+event_id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCheckinDto,
    @CurrentUser() user: any,
  ) {
    return this.interviewCheckinsService.update(id, dto, user.id);
  }
}
