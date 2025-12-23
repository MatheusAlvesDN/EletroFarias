import { Controller, Body, Post, Get, Query, BadRequestException, UseGuards, Req } from '@nestjs/common'; // Importe 'Query' e 'BadRequestException'
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService as PrismaService } from '../Prisma/prisma.service';
import { SankhyaService } from '../Sankhya/sankhya.service'; // Importe o serviço Service
import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';



export class AjusteProdutoDto {
  @IsString()
  codProd: string;

  @IsNumber()
  diference: number;
}

export class AjustePositivoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AjusteProdutoDto)
  produtos: AjusteProdutoDto[];
}

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


   @Post('updateProductLocation2')
  async updateProductLocation2(
    @Query('id') idString: number,
    @Query('location') locationString: string,
  ) {
    return this.syncService.updateProductLocation2(idString, locationString);
  }

  @Post('updateQtdMax')
  async updateQtdMax(
    @Query('id') idString: number,
    @Query('quantidade') quantidadeNumber: number,
  ) {
    return this.syncService.updateQtdMax(idString, quantidadeNumber);
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
      //this.prismaService.updateNotFound2(localizacao, codProd)
      return this.prismaService.addCount(
        codProd,
        countInt,
        stockInt,
        userEmail,
        descricao ?? '',            // 👈 garante string
        localizacao || 'Z-000'    // 👈 fallback
      );
    } finally {
      const log = "addcount: " + req.user.email + " || " + dto.codProd + " || " + dto.contagem + " || " + dto.descricao + " || " + dto.localizacao
      await this.sankhyaService.logout(token, log);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('addCount2')
  async addCount2(
    @Body() dto: { codProd: number; contagem: number; descricao: string; localizacao: string, reservado?: number },
    @Req() req: any,
  ) {
    const token = await this.sankhyaService.login();

    console.log(dto)

    try {
      const { codProd, contagem, descricao, localizacao, reservado } = dto;
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

      const items = await this.sankhyaService.getProductsByLocation(localizacao, token);
      const codProdutos: number[] = [];
      for (const item of items) {
        codProdutos.push(item.CODPROD)
      }
      //this.prismaService.updateNotFound2(localizacao, codProd);

      return this.prismaService.addCount2(
        codProd,
        countInt,
        stockInt,
        userEmail,
        descricao ?? '',            // 👈 garante string
        localizacao || 'Z-000',     // 👈 fallback
        reservado || 0
      );
    } finally {
      const log = "addcount2" + req.user.email + " || " + dto.codProd + " || " + dto.contagem + " || " + dto.descricao + " || " + dto.localizacao
      await this.sankhyaService.logout(token, log);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('addNewCount')
  async addNewCount(
    @Body() dto: { codProd: number; contagem: number; descricao: string; localizacao: string, reservado?: number },
    @Req() req: any,
  ) {
    const token = await this.sankhyaService.login();

    console.log(dto)

    try {
      const { codProd, contagem, descricao, localizacao, reservado } = dto;
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

      return this.prismaService.addNewCount(
        codProd,
        countInt,
        stockInt,
        userEmail,
        descricao ?? '',            // 👈 garante string
        localizacao || 'Z-000',     // 👈 fallback
        reservado || 0
      );
    } finally {
      const log = "addNewCount" + req.user.email + " || " + dto.codProd + " || " + dto.contagem + " || " + dto.descricao + " || " + dto.localizacao
      await this.sankhyaService.logout(token, log);
    }
  }


  //@UseGuards(JwtAuthGuard)
  @Get('getinventorylist')
  async getInventoryList() {
      return this.prismaService.getInventoryList();
  }

  //@UseGuards(JwtAuthGuard)
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
  async inplantCount(@Body() body: { diference: number, codProd: number, id: string }) {
      return this.syncService.postInplantCount(body.diference, body.codProd, body.id);
  }

  @Get('notFoundList')
  async getNotFoundList() {
      return this.syncService.getNotFoundList();
  }

  @Post('notFoundListFull')
  async notFoundListFull() {
      return this.syncService.notFoundListFull();
  }

  @Get('multiLocation')
  async getMultiLocation() {
      return this.syncService.getMultiLocation();
  }

  //@UseGuards(JwtAuthGuard)
  @Post('loginSession')
  async loginSession(@Body() body: { userEmail: string }) {
      return this.syncService.loginSession(body.userEmail);
  }

  //@UseGuards(JwtAuthGuard)
  @Post('logoutSession')
  async logoutSession(@Body() body: { userEmail: string }) {
      return this.syncService.logoutSession(body.userEmail);
  }

  @Get('getLogins')
  async getLogins() {
      return this.syncService.getLogins();
  }

  @UseGuards(JwtAuthGuard)
  @Post('alterarSenha')
  async alterarSenha(@Body() body: { newPassword: string },  @Req() req: any) {
    return this.syncService.alterarSenha(req.user.email, body.newPassword);
  }

  @Post('adicionarSeparador')
  async adicionarSeparador(@Body() body: { userEmail: string, estoque : string}) {
    
    return this.syncService.adicionarSeparador(body.userEmail, body.estoque);
  }

  @Post('removerSeparador')
  async removerSeparador (@Body() body: { userEmail: string, estoque : string}) {
    return this.syncService.removerSeparador(body.userEmail, body.estoque);
  }

  @Get('getSeparadores')
  async getSeparadores() {
    return this.syncService.getSeparadores();
  }

  @Get('getPedidoSeparador')
  async getPedidoSeparador(@Query('userEmail') userEmail: string) {
      if (!userEmail) {
        throw new BadRequestException('Parâmetro "userEmail" é obrigatório.');
      }

      console.log("syncController/getPedidoSeparador: userEmail = " + userEmail);

      return this.syncService.getPedidoSeparador(userEmail);
  }

  @Get('getEstoqueById')
  async getEstoqueById(@Query('region') region : string){
    return this.syncService.getEstoqueById(region);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getNotaSeparacao')
  async getNotaSeparacao( @Req() req: any){
    return this.sankhyaService.NotasPendentesDeSeparacao(req.authToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getNotasPendentesConferencia')
  async getNotasPendentesConferencia( @Req() req: any){
    return this.sankhyaService.getNotasStatusConferenciaA(req.authToken);
  }

  @Get('getUsuarios')
  async getUsuarios(){
    return this.syncService.getUsuarios();
  }

  
  @Post('changeRole')
  async changeRole (@Body() body: { userEmail: string, role : string}) {
    return this.syncService.changeRole(body.userEmail, body.role);
  }

  @Post('criarUsuario')
  async criarUsuario (@Body() body: { email: string, senha : string}) {
    return this.syncService.criarUsuario(body.email, body.senha);
  }

  @Get('getNotaPositiva')
  async getNotaPositva(){
    return this.syncService.getNotaPositiva();
  }

  @Post('ajustePositivo')
  async ajustePositivo(
    @Body() body: { produtos: { codProd: number; diference: number }[] },
    @Req() req: any,
  ) {
    console.log(req.user);

    const token = await this.sankhyaService.login();

    for (const produto of body.produtos) {
      console.log(`{ CODIGO: ${produto.codProd} / QUANTIDADE: ${produto.diference} }`);
    }

    // 1) tenta incluir no Sankhya (se der erro, vai lançar e NÃO executa o prisma)
    const sankhyaResp = await this.sankhyaService.incluirAjustesPositivo(body.produtos, token);

    // 2) só chega aqui se NÃO houve erro
    await this.prismaService.incluirNota(body.produtos);
   // await this.sankhyaService.confirmarNota(sankhyaResp.responseBody.pk.NUNOTA.$, token);


    // 3) devolve o que você quiser pro front
    return {
      ok: true,
      sankhya: sankhyaResp,
    };
  }


  @Get('getNotaNegativa')
  async getNotaNegativa(){
    return this.syncService.getNotaNegativa();
  }

  @Post('ajusteNegativo')
  async ajusteNegativo(
    @Body() body: { produtos: { codProd: number; diference: number }[] },
    @Req() req: any,
  ) {
    console.log(req.user);

    const token = await this.sankhyaService.login();

    for (const produto of body.produtos) {
      console.log(`{ CODIGO: ${produto.codProd} / QUANTIDADE: ${produto.diference} }`);
    }

    // 1) tenta incluir no Sankhya (se der erro, vai lançar e NÃO executa o prisma)
    const sankhyaResp = await this.sankhyaService.incluirAjustesNegativo(body.produtos, token);
    // await this.sankhyaService.confirmarNota(sankhyaResp.responseBody.pk.NUNOTA.$, token);


    // 2) só chega aqui se NÃO houve erro
    await this.prismaService.incluirNota(body.produtos);

    // 3) devolve o que você quiser pro front
    return {
      ok: true,
      sankhya: sankhyaResp,
    };
  }

 @Post('retornarProdutos')
async retornarProdutos(@Body() codProds: number[], @Req() req: any) {
  // valida
  if (!Array.isArray(codProds)) {
    throw new BadRequestException('Body deve ser um array de números');
  }

  return this.syncService.retornarProdutos(codProds);
}



}
