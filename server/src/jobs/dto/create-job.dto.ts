import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  IsArray,
  IsBoolean,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus, JobPriority, GulfCountry } from '../../generated/prisma';

export class PositionDto {
  @IsInt()
  trade_id: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsBoolean()
  accommodation?: boolean;

  @IsOptional()
  @IsBoolean()
  transportation?: boolean;

  @IsOptional()
  @IsString()
  contract_period?: string;

  @IsOptional()
  @IsString()
  age?: string;
}

export class CreateJobDto {
  @IsInt()
  company_id: number;

  @IsOptional()
  @IsInt()
  trade_id?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  positions_required?: number;

  @IsOptional()
  @IsNumber()
  salary_min?: number;

  @IsOptional()
  @IsNumber()
  salary_max?: number;

  @IsOptional()
  @IsNumber()
  service_fee?: number;

  @IsOptional()
  @IsEnum(GulfCountry)
  country?: GulfCountry;

  @IsOptional()
  @IsString()
  experience_required?: string;

  @IsOptional()
  @IsString()
  other_requirements?: string;

  @IsOptional()
  @IsString()
  interview_date_start?: string;

  @IsOptional()
  @IsString()
  interview_date_end?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  flyer_headline?: string;

  @IsOptional()
  @IsInt()
  venue_id?: number;

  @IsOptional()
  @IsString()
  coordinator_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PositionDto)
  positions?: PositionDto[];
}
