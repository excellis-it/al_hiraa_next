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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { BatchImportToInterviewDto } from './dto/batch-import.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('candidates')
@UseGuards(JwtAuthGuard)
export class CandidatesController {
  constructor(private candidatesService: CandidatesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.data_entry)
  create(
    @Body() dto: CreateCandidateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.candidatesService.create(dto, userId);
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('completion_status') completion_status?: string,
    @Query('position_id') position_id?: string,
    @Query('position_ids') position_ids?: string,
    @Query('state_id') state_id?: string,
    @Query('city_id') city_id?: string,
    @Query('source_id') source_id?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('gulf_return') gulf_return?: string,
    @Query('ecr_type') ecr_type?: string,
    @Query('include_external') include_external?: string,
    @CurrentUser() user?: any,
  ) {
    const positionIdsArr = position_ids
      ? position_ids.split(',').map(Number).filter(Boolean)
      : position_id ? [+position_id] : undefined;

    return this.candidatesService.findAll({
      page: +page,
      limit: +limit,
      search,
      status,
      completion_status,
      position_ids: positionIdsArr,
      state_id: state_id ? +state_id : undefined,
      city_id: city_id ? +city_id : undefined,
      source_id: source_id ? +source_id : undefined,
      date_from,
      date_to,
      gulf_return: gulf_return === 'true' ? true : gulf_return === 'false' ? false : undefined,
      ecr_type: ecr_type || undefined,
      include_external: include_external === 'true',
      currentUser: user,
    });
  }

  @Get('duplicate-check')
  duplicateCheck(
    @Query('passport') passport?: string,
    @Query('phone') phone?: string,
  ) {
    return this.candidatesService.duplicateCheck(passport, phone);
  }

  @Get('incomplete/queue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.data_entry, UserRole.manager, UserRole.admin)
  getIncompleteQueue(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('registered_by') registered_by?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('sort_order') sort_order?: string,
    @CurrentUser() user?: any,
  ) {
    return this.candidatesService.getIncompleteQueue({
      page: +page,
      limit: +limit,
      registered_by,
      date_from,
      date_to,
      sort_order: (sort_order as 'asc' | 'desc') || 'asc',
      currentUser: user,
    });
  }

  @Post('incomplete/bulk-delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.data_entry)
  bulkDeleteIncomplete(@Body() body: { ids: number[] }) {
    return this.candidatesService.bulkDeleteIncomplete(body.ids);
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.data_entry)
  getDashboardStats(@CurrentUser() user: any) {
    return this.candidatesService.getDashboardStats(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.data_entry)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateCandidateDto>,
    @CurrentUser('id') userId: string,
  ) {
    return this.candidatesService.update(id, dto, userId);
  }

  @Post('phones-check')
  phonesCheck(@Body() body: { phones: string[] }) {
    return this.candidatesService.phonesCheck(body.phones || []);
  }

  @Post('bulk-import-all')
  bulkImportAll(
    @Body() body: { rows: any[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.candidatesService.bulkImportAll(body.rows || [], userId);
  }

  @Post('import')
  importCandidate(
    @Body() row: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.candidatesService.importCandidate(row, userId);
  }

  @Post('batch-import-to-interview')
  batchImportToInterview(
    @Body() dto: BatchImportToInterviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.candidatesService.batchImportToInterview(dto, userId);
  }

  @Post('upload-cv')
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'cvs');
          if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `cv-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  uploadCv(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Invalid file type');
    return { cv_url: `/uploads/cvs/${file.filename}` };
  }

  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'photos');
          if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `photo-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Invalid file type. Only JPG, PNG, WEBP allowed.');
    return { photo_url: `/uploads/photos/${file.filename}` };
  }
}
