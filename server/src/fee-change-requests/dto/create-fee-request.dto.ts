import { IsNumber, IsString, Min } from 'class-validator';

export class CreateFeeRequestDto {
  @IsNumber()
  candidate_job_id: number;

  @IsNumber()
  @Min(0)
  original_fee: number;

  @IsNumber()
  @Min(0)
  requested_fee: number;

  @IsString()
  reason: string;
}
