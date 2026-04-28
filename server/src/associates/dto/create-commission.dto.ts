import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsPositive,
} from 'class-validator';

export class CreateCommissionDto {
  @IsNumber()
  @IsNotEmpty()
  associate_id: number;

  @IsNumber()
  @IsNotEmpty()
  candidate_job_id: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
