import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum InterviewTypeEnum {
  in_person = 'in_person',
  video = 'video',
  trade_test = 'trade_test',
  combined = 'combined',
}

export enum ResultsTimingEnum {
  same_day = 'same_day',
  delayed = 'delayed',
}

export enum InterviewEventStatusEnum {
  scheduled = 'scheduled',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
  postponed = 'postponed',
}

export class CreateEventDto {
  @IsNumber()
  job_id: number;

  @IsDateString()
  event_date: string;

  @IsOptional()
  @IsString()
  venue_name?: string;

  @IsOptional()
  @IsString()
  venue_address?: string;

  @IsOptional()
  @IsString()
  venue_phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  interviewer_name?: string;

  @IsOptional()
  @IsEnum(InterviewTypeEnum)
  interview_type?: InterviewTypeEnum;

  @IsOptional()
  @IsEnum(ResultsTimingEnum)
  results_timing?: ResultsTimingEnum;

  @IsOptional()
  @IsEnum(InterviewEventStatusEnum)
  status?: InterviewEventStatusEnum;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  vendor_id?: number;

  @IsOptional()
  @IsBoolean()
  accommodation?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accommodation_cost?: number;

  @IsOptional()
  @IsBoolean()
  transportation?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transportation_cost?: number;
}
