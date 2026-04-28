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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('summary')
  @Roles(UserRole.process_manager)
  getSummary(@Query('candidate_job_id') candidateJobId: string) {
    return this.paymentsService.getSummary(+candidateJobId);
  }

  @Get()
  @Roles(UserRole.process_manager)
  findByCandidateJob(@Query('candidate_job_id') candidateJobId: string) {
    return this.paymentsService.findByCandidateJob(+candidateJobId);
  }

  @Post()
  @Roles(UserRole.manager)
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.create(dto, user.id);
  }

  @Put(':id/record')
  @Roles(UserRole.process_manager)
  recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.recordPayment(id, dto, user.id);
  }

  @Put(':id/waive')
  @Roles(UserRole.manager)
  waivePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { waiver_amount: number; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.waivePayment(id, dto, user.id);
  }
}
