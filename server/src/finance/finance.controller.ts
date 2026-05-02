import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('overview')
  @Roles(UserRole.manager)
  getOverview(
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
  ) {
    return this.financeService.getOverview({
      from_date: from_date || undefined,
      to_date: to_date || undefined,
    });
  }

  @Get('report')
  @Roles(UserRole.process_manager)
  getReport(
    @Query('from_date') from_date?: string,
    @Query('to_date')   to_date?: string,
    @Query('search')    search?: string,
  ) {
    return this.financeService.getReport({ from_date, to_date, search });
  }

  @Get('payments')
  @Roles(UserRole.process_manager)
  getAllPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('per_page') per_page?: string,
    @Query('status') status?: string,
    @Query('candidate_name') candidate_name?: string,
    @Query('search') search?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
  ) {
    return this.financeService.getAllPayments({
      page: page ? +page : 1,
      limit: limit ? +limit : (per_page ? +per_page : 20),
      status,
      search: search || candidate_name,
      from_date,
      to_date,
    });
  }

  @Get('payments/:candidateJobId')
  @Roles(UserRole.process_manager)
  getPaymentsByCandidate(
    @Param('candidateJobId', ParseIntPipe) candidateJobId: number,
  ) {
    return this.financeService.getPaymentsByCandidate(candidateJobId);
  }
}
