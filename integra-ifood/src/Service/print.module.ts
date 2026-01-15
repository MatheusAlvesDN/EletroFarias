import { Module } from '@nestjs/common';
import { PrintService } from './print.service';

@Module({
  providers: [PrintService],
  exports: [PrintService], // <<< obrigatório pra outros módulos conseguirem injetar
})
export class PrintModule {}
