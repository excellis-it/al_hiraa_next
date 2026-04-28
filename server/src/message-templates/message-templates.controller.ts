import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { MessageTemplatesService } from './message-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma';

@Controller('message-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessageTemplatesController {
  constructor(private messageTemplatesService: MessageTemplatesService) {}

  @Get()
  @Roles(UserRole.recruiter)
  findAll(
    @Query('type') type?: string,
    @Query('is_active') isActive?: string,
  ) {
    const params: { type?: string; is_active?: boolean } = {};
    if (type) params.type = type;
    if (isActive !== undefined) params.is_active = isActive === 'true';
    return this.messageTemplatesService.findAll(params);
  }

  @Post()
  @Roles(UserRole.manager)
  create(@Body() dto: CreateTemplateDto) {
    return this.messageTemplatesService.create(dto);
  }

  @Get(':id')
  @Roles(UserRole.recruiter)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.messageTemplatesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.manager)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.messageTemplatesService.update(id, dto);
  }

  @Post(':id/preview')
  @Roles(UserRole.recruiter)
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { sample_data: Record<string, string> },
  ) {
    return this.messageTemplatesService.preview(id, body.sample_data || {});
  }
}
