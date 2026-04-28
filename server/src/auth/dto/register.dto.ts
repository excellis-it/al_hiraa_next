import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../generated/prisma';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  full_name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
