import { Module } from '@nestjs/common';
import { FeeChangeRequestsController } from './fee-change-requests.controller';
import { FeeChangeRequestsService } from './fee-change-requests.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeeChangeRequestsController],
  providers: [FeeChangeRequestsService],
  exports: [FeeChangeRequestsService],
})
export class FeeChangeRequestsModule {}
