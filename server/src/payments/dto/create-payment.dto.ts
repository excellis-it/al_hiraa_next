import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  candidate_job_id: number;

  @IsNumber()
  @Min(0)
  total_fee: number;

  @IsNumber()
  @Min(1)
  installment_number: number;

  @IsNumber()
  @Min(0)
  amount_due: number;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee_waiver_amount?: number;

  @IsOptional()
  @IsDateString()
  paid_date?: string;

  // Explicit payment status — when provided, takes priority over date-based inference
  @IsOptional()
  @IsIn(['paid', 'pending'])
  status?: 'paid' | 'pending';

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
