import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret || secret === 'dev-secret-key') {
          if (config.get('NODE_ENV') === 'production') {
            throw new Error('JWT_SECRET must be set to a secure value in production');
          }
          console.warn('[AUTH] WARNING: Using default JWT_SECRET — set JWT_SECRET in .env for security');
        }
        return {
          secret: secret || 'dev-secret-key',
          signOptions: { expiresIn: config.get('JWT_EXPIRY', '8h') },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
