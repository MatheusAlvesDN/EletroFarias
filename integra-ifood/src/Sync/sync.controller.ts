import { Controller, Post, Get, Query, BadRequestException } from '@nestjs/common'; // Importe 'Query' e 'BadRequestException'
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) { }

  @Post('create')
  async createCategoryById(@Query('id') idString: string) { // <--- USE @Query('id') para pegar o parâmetro 'id' da URL
    // Adicionar log para verificar o que está sendo recebido
    console.log('ID recebido no SyncController (como string - Query Parameter):', idString);

    // Converta a string para número de forma robusta
    const productId = parseInt(idString, 10);

    // Verifique se a conversão resultou em um número válido
    if (isNaN(productId)) {
      console.error('Erro: O ID passado não é um número válido:', idString);
      throw new BadRequestException('ID de produto inválido. Por favor, forneça um número.');
    }

    console.log('ID do produto após conversão para number:', productId);

    return this.syncService.createCategoryByProdId(productId);
  }

  @Post('delete')
  async deleteCategoryById(@Query('id') idString: string) {
    const productId = parseInt(idString, 10);
    if (isNaN(productId)) {
      console.error('Erro: O ID passado não é um número válido:', idString);
      throw new BadRequestException('ID de produto inválido. Por favor, forneça um número.');
    }

    console.log('ID do produto após conversão para number:', productId);

    return this.syncService.deleteCategoryByProdId(productId);
  }

  @Post('updateEAN') 
  async updateEAN(){
  await this.syncService.teste()
  }
  
  @Post('getAllCategories')
  async getAllCategories() {
  return this.syncService.getAllCategories();
  }

  @Get('getProductLocation')
  async getProductLocation(@Query('id') idString: number) {
  return this.syncService.getProductLocation(idString);
  }

  @Post('updateProductLocation')
  async updateProductLocation(@Query('id') idString: number,@Query('location') locationString: string) {
  return this.syncService.updateProductLocation(idString,decodeURI(locationString));
  }

}
