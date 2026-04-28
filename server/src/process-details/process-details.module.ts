import { Module } from '@nestjs/common';
import { ProcessDetailsController } from './process-details.controller';
import { ProcessDetailsService } from './process-details.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProcessDetailsController],
  providers: [ProcessDetailsService],
  exports: [ProcessDetailsService],
})
export class ProcessDetailsModule {}
