import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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

  @IsDateString()
  due_date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
