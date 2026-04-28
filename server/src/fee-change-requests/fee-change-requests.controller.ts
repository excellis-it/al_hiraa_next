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
import { FeeChangeRequestsService } from './fee-change-requests.service';
import { CreateFeeRequestDto } from './dto/create-fee-request.dto';
import { ReviewFeeRequestDto } from './dto/review-fee-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('fee-change-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeeChangeRequestsController {
  constructor(private feeChangeRequestsService: FeeChangeRequestsService) {}

  @Get()
  @Roles(UserRole.manager)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.feeChangeRequestsService.findAll({
      page: +page,
      limit: +limit,
      status,
    });
  }

  @Post()
  @Roles(UserRole.process_manager)
  create(@Body() dto: CreateFeeRequestDto, @CurrentUser() user: any) {
    return this.feeChangeRequestsService.create(dto, user.id);
  }

  @Put(':id/review')
  @Roles(UserRole.manager)
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewFeeRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.feeChangeRequestsService.review(id, dto, user.id);
  }
}
