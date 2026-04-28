import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ReferrersService } from './referrers.service';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('referrers')
@UseGuards(JwtAuthGuard)
export class ReferrersController {
  constructor(private referrersService: ReferrersService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.referrersService.findAll(all === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.referrersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateReferrerDto) {
    return this.referrersService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateReferrerDto>) {
    return this.referrersService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.referrersService.deactivate(id);
  }
}
