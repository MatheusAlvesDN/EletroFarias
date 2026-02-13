import { Module } from '@nestjs/common';
import { ExpedicaoService } from './expedicao.service';

@Module({
  providers: [ExpedicaoService],
  exports: [ExpedicaoService], 
})
export class ExpedicaoModule {}
