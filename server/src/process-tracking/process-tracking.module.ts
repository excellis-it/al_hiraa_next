import { Module } from '@nestjs/common';
import { ProcessTrackingController } from './process-tracking.controller';
import { ProcessTrackingService } from './process-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProcessTrackingController],
  providers: [ProcessTrackingService],
  exports: [ProcessTrackingService],
})
export class ProcessTrackingModule {}
