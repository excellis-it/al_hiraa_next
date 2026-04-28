import { Module } from '@nestjs/common';
import { InterviewCheckinsController } from './interview-checkins.controller';
import { InterviewCheckinsService } from './interview-checkins.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InterviewCheckinsController],
  providers: [InterviewCheckinsService],
  exports: [InterviewCheckinsService],
})
export class InterviewCheckinsModule {}
