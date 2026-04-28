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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.recruiter)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.companiesService.findAll({
      page: +page,
      limit: +limit,
      search,
      status,
    });
  }

  @Post()
  @Roles(UserRole.manager)
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: any,
  ) {
    return this.companiesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.manager)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    return this.companiesService.update(id, dto);
  }
}
