import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum DropoutReasonEnum {
  other_offer = 'other_offer',
  family_pressure = 'family_pressure',
  financial_issues = 'financial_issues',
  medical_unfit = 'medical_unfit',
  visa_rejected = 'visa_rejected',
  salary_mismatch = 'salary_mismatch',
  personal_reasons = 'personal_reasons',
  other = 'other',
}

export class CreateDropoutDto {
  @IsNumber()
  candidate_job_id: number;

  @IsString()
  dropout_stage: string;

  @IsEnum(DropoutReasonEnum)
  dropout_reason: DropoutReasonEnum;

  @IsOptional()
  @IsString()
  reason_details?: string;
}
