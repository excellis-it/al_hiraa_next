import { Module } from '@nestjs/common';
import { CallLogsController } from './call-logs.controller';
import { CallLogsService } from './call-logs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CallLogsController],
  providers: [CallLogsService],
  exports: [CallLogsService],
})
export class CallLogsModule {}
