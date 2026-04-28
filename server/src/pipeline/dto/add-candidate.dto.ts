import { IsInt, IsOptional, IsString } from 'class-validator';

export class AddCandidateDto {
  @IsInt()
  candidate_id: number;

  @IsInt()
  job_id: number;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
