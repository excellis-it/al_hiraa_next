import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { CallLogsService } from './call-logs.service';
import { CreateCallLogDto } from './dto/create-call-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('call-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.recruiter)
export class CallLogsController {
  constructor(private callLogsService: CallLogsService) {}

  @Get()
  find(
    @Query('candidate_job_id') candidateJobId?: string,
    @Query('candidate_id') candidateId?: string,
  ) {
    if (candidateId) return this.callLogsService.findByCandidate(+candidateId);
    if (!candidateJobId) throw new BadRequestException('candidate_job_id or candidate_id required');
    return this.callLogsService.findByCandidateJob(+candidateJobId);
  }

  @Post()
  create(
    @Body() dto: CreateCallLogDto,
    @CurrentUser() user: any,
  ) {
    return this.callLogsService.create(dto, user.id);
  }
}
