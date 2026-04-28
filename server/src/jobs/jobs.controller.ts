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
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.recruiter)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  // Must be defined BEFORE /:id to avoid route collision
  @Get('dashboard')
  getDashboard() {
    return this.jobsService.getDashboard();
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('company_id') company_id?: string,
    @Query('trade_id') trade_id?: string,
    @Query('priority') priority?: string,
  ) {
    return this.jobsService.findAll({
      page: +page,
      limit: +limit,
      search,
      status,
      company_id: company_id ? +company_id : undefined,
      trade_id: trade_id ? +trade_id : undefined,
      priority,
    });
  }

  @Post()
  @Roles(UserRole.manager)
  create(
    @Body() dto: CreateJobDto,
    @CurrentUser() user: any,
  ) {
    return this.jobsService.create(dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.manager)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: any,
  ) {
    return this.jobsService.update(id, dto);
  }
}
