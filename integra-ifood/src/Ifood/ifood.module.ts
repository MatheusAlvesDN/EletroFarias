import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { IfoodService } from './ifood.service';
import { IfoodController } from './ifood.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [IfoodController],
  providers: [IfoodService],
  exports: [IfoodService],
})
export class IfoodModule {}
