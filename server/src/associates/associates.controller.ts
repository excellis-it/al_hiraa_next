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
import { AssociatesService } from './associates.service';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('associates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssociatesController {
  constructor(private associatesService: AssociatesService) {}

  @Get()
  @Roles(UserRole.manager)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.associatesService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      search,
      status,
    });
  }

  @Post()
  @Roles(UserRole.manager)
  create(@Body() dto: CreateAssociateDto) {
    return this.associatesService.create(dto);
  }

  @Get(':id')
  @Roles(UserRole.manager)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.associatesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.manager)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssociateDto,
  ) {
    return this.associatesService.update(id, dto);
  }

  @Get(':id/commission-summary')
  @Roles(UserRole.manager)
  getCommissionSummary(@Param('id', ParseIntPipe) id: number) {
    return this.associatesService.getCommissionSummary(id);
  }

  @Post('commissions')
  @Roles(UserRole.manager)
  createCommission(
    @Body() dto: CreateCommissionDto,
    @CurrentUser() user: any,
  ) {
    return this.associatesService.createCommission(dto, user.id);
  }

  @Put('commissions/:id')
  @Roles(UserRole.manager)
  updateCommissionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.associatesService.updateCommissionStatus(id, status);
  }
}
