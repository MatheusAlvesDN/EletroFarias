import { Controller, Body, Post, Get, Query, BadRequestException, UseGuards, Req } from '@nestjs/common'; // Importe 'Query' e 'BadRequestException'
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../Prisma/prisma.service';
import { SankhyaService } from '../Sankhya/sankhya.service'; // Importe o serviço Service

@Controller('sync')
export class SyncController {
  constructor(
    private syncService: SyncService,
    private usersService: UsersService,
    private sankhyaService: SankhyaService,
  ) { }


  @Post('create')
  async createCategoryById(@Query('id') idString: string) {
    // <--- USE @Query('id') para pegar o parâmetro 'id' da URL
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
  async updateEAN() {

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
  async updateProductLocation(
    @Query('id') idString: number,
    @Query('location') locationString: string,
  ) {
    return this.syncService.updateProductLocation(idString, locationString);
  }

  @Post('claimReward')
  async claimReward(@Body() payload: any) {
    await this.syncService.claimreward(payload);
    console.log('Payload recebido:', payload);
    return { message: 'Resgate recebido com sucesso' };
  }

  @Post('userRegister')
  async userRegister(@Body() payload: any) {
    console.log('Payload recebido:', payload);
    await this.syncService.registerUser(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addcount')
  async addCount(
    @Body() dto: { codProd: number; contagem: number },
    @Req() req: any,
  ) {
    const { codProd, contagem } = dto;
    const token = await this.sankhyaService.login();
    // aqui vem do token JWT
    const userEmail: string = req.user.email;

    // se você também buscar o inStock em outro lugar:
    const linhas = await this.sankhyaService.getEstoqueFront(codProd, token);

    const linha1100 = linhas.find(
      (l) => Number(l.CODLOCAL) === 1100,
    );

    const inStock =
      linha1100 && Number.isFinite(Number(linha1100.DISPONIVEL))
        ? Number(linha1100.DISPONIVEL)
        : 0;

        
    // exemplo simples: só registra count e inStock = contagem
    return this.usersService.addCount(
      codProd,
      contagem,
      inStock,
      userEmail
    );
    await this.sankhyaService.logout(token);
  }

  @Get("getInventoryList")
  async getInventoryList() {
    return this.syncService.getInventoryList();
  }


}