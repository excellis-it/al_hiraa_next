import { IsOptional, IsEnum, IsString } from 'class-validator';
import { InterestStatus } from '../../generated/prisma';

export class UpdateStatusDto {
  @IsOptional()
  @IsEnum(InterestStatus)
  status?: InterestStatus;

  @IsOptional()
  @IsString()
  follow_up_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}
