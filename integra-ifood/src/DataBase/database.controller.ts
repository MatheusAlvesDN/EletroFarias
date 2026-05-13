import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { DataBaseService } from './database.service';

@Controller('database')
export class DataBaseController {
  constructor(private readonly dataBaseService: DataBaseService) {}

  @Get('my-ip')
  async getMyIp() {
    return { ip: await this.dataBaseService.logPublicIp() };
  }

  @Get('search')
  async search(@Query('q') query?: string, @Query('codes') codes?: string) {
    if (codes) {
      const codProd = codes.split(',').map(c => c.trim());
      return this.dataBaseService.getItems(codProd);
    }
    return this.dataBaseService.searchByName(query || '');
  }

  @Get('customers')
  async searchCustomers(@Query('q') query: string) {
    return this.dataBaseService.searchCustomers(query);
  }

  @Get('price/:codProd')
  async getPrice(@Param('codProd') codProd: string) {
    return this.dataBaseService.getPrice(Number(codProd));
  }

  @Get('items')
  async getAllItems() {
    return this.dataBaseService.getAllItems();
  }

  @Get('stock/:codProd')
  async getStock(@Param('codProd') codProd: string) {
    return this.dataBaseService.getStock(Number(codProd));
  }

  @Get('detail/:codProd')
  async getItemDetailed(@Param('codProd') codProd: string) {
    return this.dataBaseService.getItemDetailed(codProd);
  }

  @Get('portal-notas')
  async getPortalNotas(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('nota') nota?: string,
    @Query('empresa') empresa?: string,
    @Query('parceiro') parceiro?: string,
    @Query('confirmada') confirmada?: string,
  ) {
    return this.dataBaseService.getPortalNotas({
      dataInicio,
      dataFim,
      nota,
      empresa,
      parceiro,
      confirmada,
    });
  }

  @Post('save-orcamento')
  async saveOrcamento(@Body() data: any) {
    return this.dataBaseService.saveEstoqueOrcamento(data);
  }
}
