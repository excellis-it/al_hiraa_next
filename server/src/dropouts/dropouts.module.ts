import { Module } from '@nestjs/common';
import { DropoutsController } from './dropouts.controller';
import { DropoutsService } from './dropouts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DropoutsController],
  providers: [DropoutsService],
  exports: [DropoutsService],
})
export class DropoutsModule {}
