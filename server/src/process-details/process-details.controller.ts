import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import { ProcessDetailsService } from './process-details.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('process-details')
@UseGuards(JwtAuthGuard, RolesGuard)
// Recruiters can read process records for candidates they're assigned to (service-side scope).
// Process managers / managers / admins see everything; the service applies the role-aware filter.
@Roles(UserRole.recruiter, UserRole.process_manager, UserRole.manager, UserRole.admin)
export class ProcessDetailsController {
  constructor(private readonly service: ProcessDetailsService) {}

  @Get('stage-summary')
  getStageSummary() {
    return this.service.getStageSummary();
  }

  @Get('export')
  exportAll(
    @Query('search')           search?: string,
    @Query('medical_status')   medical_status?: string,
    @Query('candidate_status') candidate_status?: string,
    @Query('year')             year?: string,
    @Query('job_id')           job_id?: string,
    @CurrentUser()             user?: any,
  ) {
    return this.service.exportAll({
      search,
      medical_status,
      candidate_status,
      year:   year   ? +year   : undefined,
      job_id: job_id ? +job_id : undefined,
      currentUser: user,
    });
  }

  @Get()
  findAll(
    @Query('page')             page?: string,
    @Query('limit')            limit?: string,
    @Query('search')           search?: string,
    @Query('medical_status')   medical_status?: string,
    @Query('candidate_status') candidate_status?: string,
    @Query('year')             year?: string,
    @Query('job_id')           job_id?: string,
    @CurrentUser()             user?: any,
  ) {
    return this.service.findAll({
      page:   page   ? +page   : undefined,
      limit:  limit  ? +limit  : undefined,
      search,
      medical_status,
      candidate_status,
      year:   year   ? +year   : undefined,
      job_id: job_id ? +job_id : undefined,
      currentUser: user,
    });
  }

  // POST /process-details/batch-from-interview
  @Post('batch-from-interview')
  batchFromInterview(@Body() body: { candidate_job_ids: number[]; initial_data?: any }) {
    return this.service.batchFromInterview(body.candidate_job_ids, body.initial_data);
  }

  // POST /process-details/quick-add  (passport = primary key)
  @Post('quick-add')
  quickAdd(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.quickAdd({ ...dto, registered_by: user.id });
  }

  // POST /process-details/import-csv
  @Post('import-csv')
  importFromCsv(@Body() body: { rows: any[]; job_id: number }, @CurrentUser() user: any) {
    return this.service.importFromCsv(body.rows, body.job_id, user.id);
  }

  // POST /process-details/upload-doc — upload passport or ID document
  @Post('upload-doc')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const p = join(process.cwd(), 'uploads', 'process-docs');
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
        cb(null, p);
      },
      filename: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  uploadDoc(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    return { url: `/uploads/process-docs/${file.filename}`, name: file.originalname };
  }

  @Get(':candidateJobId')
  getOrCreate(@Param('candidateJobId', ParseIntPipe) candidateJobId: number) {
    return this.service.getOrCreate(candidateJobId);
  }

  @Put(':candidateJobId')
  update(
    @Param('candidateJobId', ParseIntPipe) candidateJobId: number,
    @Body() dto: any,
  ) {
    return this.service.update(candidateJobId, dto);
  }
}
