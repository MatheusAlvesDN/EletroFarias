import { Module, Global } from '@nestjs/common';
import { DataBaseService } from './database.service';
import { DataBaseController } from './database.controller';

@Global()
@Module({
  controllers: [DataBaseController],
  providers: [DataBaseService],
  exports: [DataBaseService],
})
export class DataBaseModule {}
