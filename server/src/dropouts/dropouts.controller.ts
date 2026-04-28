import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DropoutsService } from './dropouts.service';
import { CreateDropoutDto } from './dto/create-dropout.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('dropouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.recruiter)
export class DropoutsController {
  constructor(private dropoutsService: DropoutsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('stage') stage?: string,
    @Query('reason') reason?: string,
  ) {
    return this.dropoutsService.findAll({
      page: +page,
      limit: +limit,
      stage,
      reason,
    });
  }

  @Post()
  create(@Body() dto: CreateDropoutDto, @CurrentUser() user: any) {
    return this.dropoutsService.create(dto, user.id);
  }
}
