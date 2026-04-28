import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum CheckinStatusEnum {
  expected = 'expected',
  arrived = 'arrived',
  no_show = 'no_show',
  late = 'late',
}

export enum InterviewStatusEnum {
  waiting = 'waiting',
  in_interview = 'in_interview',
  completed = 'completed',
}

export enum InterviewResultEnum {
  selected = 'selected',
  rejected = 'rejected',
  on_hold = 'on_hold',
  pending = 'pending',
}

export class UpdateCheckinDto {
  @IsOptional()
  @IsEnum(CheckinStatusEnum)
  checkin_status?: CheckinStatusEnum;

  @IsOptional()
  @IsDateString()
  checkin_time?: string;

  @IsOptional()
  @IsEnum(InterviewStatusEnum)
  interview_status?: InterviewStatusEnum;

  @IsOptional()
  @IsEnum(InterviewResultEnum)
  result?: InterviewResultEnum;

  @IsOptional()
  @IsString()
  result_notes?: string;

  @IsOptional()
  @IsNumber()
  slot_number?: number;
}
