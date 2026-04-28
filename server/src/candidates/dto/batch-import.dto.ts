import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EcrType, Gender, RegistrationMode } from '../../generated/prisma';

export class BatchImportRowDto {
  @IsString()
  full_name: string;

  @IsString()
  passport_no: string;

  @IsOptional()
  @IsString()
  whatsapp_no?: string;

  @IsOptional()
  @IsString()
  alternate_contact?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(EcrType)
  ecr_type?: EcrType;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  indian_experience?: string;

  @IsOptional()
  @IsString()
  abroad_experience?: string;

  @IsOptional()
  @IsInt()
  associate_id?: number;

  @IsOptional()
  @IsInt()
  referrer_id?: number;

  @IsOptional()
  @IsEnum(RegistrationMode)
  registration_mode?: RegistrationMode;
}

export class BatchImportToInterviewDto {
  @IsInt()
  event_id: number;

  @IsInt()
  trade_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchImportRowDto)
  rows: BatchImportRowDto[];
}
