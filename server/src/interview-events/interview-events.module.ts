import { Module } from '@nestjs/common';
import { InterviewEventsController } from './interview-events.controller';
import { InterviewEventsService } from './interview-events.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InterviewEventsController],
  providers: [InterviewEventsService],
  exports: [InterviewEventsService],
})
export class InterviewEventsModule {}
