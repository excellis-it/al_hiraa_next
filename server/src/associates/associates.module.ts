import { Module } from '@nestjs/common';
import { AssociatesController } from './associates.controller';
import { AssociatesService } from './associates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssociatesController],
  providers: [AssociatesService],
  exports: [AssociatesService],
})
export class AssociatesModule {}
