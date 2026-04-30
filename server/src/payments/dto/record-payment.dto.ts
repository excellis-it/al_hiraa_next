import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_paid?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_due?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee_waiver_amount?: number;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  receipt_number?: string;

  @IsOptional()
  @IsDateString()
  paid_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
