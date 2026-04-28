import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InterviewEventsService } from './interview-events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('interview-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewEventsController {
  constructor(private interviewEventsService: InterviewEventsService) {}

  @Get()
  @Roles(UserRole.recruiter)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('job_id') job_id?: string,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.interviewEventsService.findAll({
      page: +page,
      limit: +limit,
      job_id: job_id ? +job_id : undefined,
      status,
      upcoming: upcoming === 'true',
    });
  }

  @Post()
  @Roles(UserRole.manager)
  create(@Body() dto: CreateEventDto, @CurrentUser() user: any) {
    return this.interviewEventsService.create(dto, user.id);
  }

  @Get(':id')
  @Roles(UserRole.recruiter)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.interviewEventsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.manager)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
  ) {
    return this.interviewEventsService.update(id, dto);
  }

  @Post(':id/add-candidates')
  @Roles(UserRole.recruiter)
  bulkAddCandidates(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { candidate_job_ids: number[] },
  ) {
    return this.interviewEventsService.bulkAddCandidates(id, body.candidate_job_ids);
  }

  @Get(':id/status-counts')
  @Roles(UserRole.recruiter)
  getStatusCounts(@Param('id', ParseIntPipe) id: number) {
    return this.interviewEventsService.getStatusCounts(id);
  }

  @Post(':id/add-master-candidate')
  @Roles(UserRole.recruiter)
  addMasterCandidate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { candidate_id: number; trade_id: number },
  ) {
    return this.interviewEventsService.addMasterCandidate(
      id,
      body.candidate_id,
      body.trade_id,
    );
  }

  @Post(':id/add-sub-agent-candidates')
  @Roles(UserRole.recruiter)
  addSubAgentCandidates(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      associate_id: number;
      trade_id: number;
      rows: Array<{
        full_name: string;
        whatsapp_no: string;
        passport_no?: string;
        dob?: string;
        remarks?: string;
      }>;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.interviewEventsService.addSubAgentCandidates(
      id,
      body.associate_id,
      body.trade_id,
      body.rows || [],
      userId,
    );
  }
}
