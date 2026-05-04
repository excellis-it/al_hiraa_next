import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  // Read endpoints — process_manager and manager need vendor data when editing
  // process records and configuring interviews.
  @Get()
  @Roles(UserRole.process_manager, UserRole.manager, UserRole.admin)
  findAll(
    @Query('page')   page?: string,
    @Query('limit')  limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.vendorsService.findAll({
      page:   page  ? +page  : undefined,
      limit:  limit ? +limit : undefined,
      search,
      status,
    });
  }

  @Get(':id')
  @Roles(UserRole.process_manager, UserRole.manager, UserRole.admin)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.findOne(id);
  }

  // Mutations remain admin-only.
  @Post()
  @Roles(UserRole.admin)
  create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.admin)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateVendorDto>) {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.remove(id);
  }
}
