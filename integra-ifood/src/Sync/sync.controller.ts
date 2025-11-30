import { Controller, Body, Post, Get, Query, BadRequestException, UseGuards, Req } from '@nestjs/common'; // Importe 'Query' e 'BadRequestException'
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService as PrismaService } from '../Prisma/prisma.service';
import { SankhyaService } from '../Sankhya/sankhya.service'; // Importe o serviço Service

@Controller('sync')
export class SyncController {
  constructor(
    private syncService: SyncService,
    private prismaService: PrismaService,
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
    @Body() dto: { codProd: number; contagem: number; descricao: string; localizacao: string },
    @Req() req: any,
  ) {
    const token = await this.sankhyaService.login();

    try {
      const { codProd, contagem, descricao, localizacao } = dto;
      const userEmail: string = req.user.email;

      const linhas = await this.sankhyaService.getEstoqueFront(codProd, token);

      const linha1100 = linhas.find(
        (l) => Number(l.CODLOCAL) === 1100,
      );

      const inStockRaw =
        linha1100 && Number.isFinite(Number(linha1100.DISPONIVEL))
          ? Number(linha1100.DISPONIVEL)
          : 0;

      const countInt = Math.round(contagem);   // 👈 garante Int
      const stockInt = Math.round(inStockRaw); // 👈 garante Int

      return this.prismaService.addCount(
        codProd,
        countInt,
        stockInt,
        userEmail,
        descricao ?? '',            // 👈 garante string
        localizacao || 'Z-000',     // 👈 fallback
      );
    } finally {
      await this.sankhyaService.logout(token);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('getinventorylist')
  async getInventoryList() {
    return this.prismaService.getInventoryList();
  }

  @UseGuards(JwtAuthGuard)
  @Get('getProductsByLocation')
  async getProductsByLocation(@Query('loc') loc: string) {
    if (!loc || !loc.trim()) {
      throw new BadRequestException('Parâmetro "loc" é obrigatório');
    }

    const location = loc.trim().toUpperCase();
    return this.syncService.getProductsByLocation(location);
  }

  @Post('updateInventoryDate')
  async updateInventoryDate(@Body() body: { count: number, codProd: number, id: string }) {
    return this.syncService.postInplantCount(body.count, body.codProd, body.id);
  }

  @Post('inplantCount')
  async inplantCount(@Body() body: { count: number, codProd: number, id: string }) {
    return this.syncService.postInplantCount(body.count, body.codProd, body.id);
  }
}
