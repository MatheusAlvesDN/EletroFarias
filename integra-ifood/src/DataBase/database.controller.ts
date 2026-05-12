import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { DataBaseService } from './database.service';

@Controller('database')
export class DataBaseController {
  constructor(private readonly dataBaseService: DataBaseService) {}

  @Get('search')
  async search(@Query('q') query?: string, @Query('codes') codes?: string) {
    if (codes) {
      const codProd = codes.split(',').map(c => c.trim());
      return this.dataBaseService.getItems(codProd);
    }
    return this.dataBaseService.searchByName(query || '');
  }

  @Get('price/:codProd')
  async getPrice(@Param('codProd') codProd: string) {
    return this.dataBaseService.getPrice(Number(codProd));
  }

  @Get('items')
  async getAllItems() {
    return this.dataBaseService.getAllItems();
  }

  @Get('stock/:codProd/:codLocal')
  async getStock(@Param('codProd') codProd: string, @Param('codLocal') codLocal: string) {
    return this.dataBaseService.getStock(Number(codProd), Number(codLocal));
  }

  @Get('detail/:codProd')
  async getItemDetailed(@Param('codProd') codProd: string) {
    return this.dataBaseService.getItemDetailed(codProd);
  }
}
