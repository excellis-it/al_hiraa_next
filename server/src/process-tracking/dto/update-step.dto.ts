import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum StepStatus {
  not_started = 'not_started',
  in_progress = 'in_progress',
  completed = 'completed',
  on_hold = 'on_hold',
  failed = 'failed',
}

export enum StepFailureAction {
  retry = 'retry',
  release = 'release',
}

export class UpdateStepDto {
  @IsOptional()
  @IsEnum(StepStatus)
  status?: StepStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(StepFailureAction)
  failure_action?: StepFailureAction;

  @IsOptional()
  @IsString()
  failure_reason?: string;

  @IsOptional()
  @IsObject()
  step_data?: object;
}
