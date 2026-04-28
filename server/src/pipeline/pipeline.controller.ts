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
import { PipelineService } from './pipeline.service';
import { AddCandidateDto } from './dto/add-candidate.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.recruiter)
export class PipelineController {
  constructor(private pipelineService: PipelineService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('job_id') job_id?: string,
    @Query('status') status?: string,
    @Query('assigned_to') assigned_to?: string,
    @Query('follow_up_today') follow_up_today?: string,
    @Query('search') search?: string,
  ) {
    return this.pipelineService.findAll({
      page: +page,
      limit: +limit,
      job_id: job_id ? +job_id : undefined,
      status,
      assigned_to,
      follow_up_today: follow_up_today === 'true',
      search,
    });
  }

  @Post()
  addCandidate(
    @Body() dto: AddCandidateDto,
    @CurrentUser() user: any,
  ) {
    return this.pipelineService.addCandidate(dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pipelineService.findOne(id);
  }

  @Put(':id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.pipelineService.updateStatus(id, dto, user.id);
  }
}
