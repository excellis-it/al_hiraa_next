import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsEnum,
  MinLength,
} from 'class-validator';
import { GulfCountry, Industry, CompanyStatus } from '../../generated/prisma';

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsEnum(GulfCountry)
  country?: GulfCountry;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @IsOptional()
  @IsString()
  contact_person?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  agreement_details?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
