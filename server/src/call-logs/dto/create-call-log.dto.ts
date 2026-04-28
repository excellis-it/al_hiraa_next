import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { CallOutcome } from '../../generated/prisma';

export class CreateCallLogDto {
  @IsOptional()
  @IsInt()
  candidate_job_id?: number;

  @IsOptional()
  @IsInt()
  candidate_id?: number;

  @IsEnum(CallOutcome)
  outcome: CallOutcome;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  follow_up_date?: string;
}
