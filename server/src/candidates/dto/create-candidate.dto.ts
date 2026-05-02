import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  IsEmail,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import {
  Gender,
  EcrType,
  RegistrationMode,
  EnglishLevel,
  CandidateStatus,
} from '../../generated/prisma';

export class CreateCandidateDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  full_name: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  whatsapp_no?: string;

  @IsOptional()
  @IsString()
  alternate_contact?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString()
  passport_no?: string;

  @IsOptional()
  @IsDateString()
  passport_expiry_date?: string;

  @IsOptional()
  @IsEnum(EcrType)
  ecr_type?: EcrType;

  @IsOptional()
  @IsInt()
  state_id?: number;

  @IsOptional()
  @IsInt()
  city_id?: number;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  education_other?: string;

  @IsOptional()
  @IsInt()
  position_1_id?: number;

  @IsOptional()
  @IsInt()
  position_2_id?: number;

  @IsOptional()
  @IsInt()
  position_3_id?: number;

  @IsOptional()
  @IsString()
  indian_experience?: string;

  @IsOptional()
  @IsString()
  abroad_experience?: string;

  @IsOptional()
  @IsArray()
  indian_driving_license?: string[];

  @IsOptional()
  @IsArray()
  gulf_driving_license?: string[];

  @IsOptional()
  @IsEnum(EnglishLevel)
  english_speaking?: EnglishLevel;

  @IsOptional()
  @IsBoolean()
  arabic_speaking?: boolean;

  @IsOptional()
  @IsBoolean()
  gulf_return?: boolean;

  @IsOptional()
  @IsString()
  gulf_return_details?: string;

  @IsEnum(RegistrationMode)
  registration_mode: RegistrationMode;

  @IsOptional()
  @IsInt()
  source_id?: number;

  @IsOptional()
  @IsString()
  referred_by?: string;

  @IsOptional()
  @IsInt()
  associate_id?: number;

  @IsOptional()
  @IsString()
  cv_url?: string;

  @IsOptional()
  @IsInt()
  referrer_id?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;
}
