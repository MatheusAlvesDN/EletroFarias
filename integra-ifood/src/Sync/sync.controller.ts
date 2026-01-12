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

  @Get('getProduct')
  async getProduct(
    @Query('codProd') codProdQ?: string,
    @Query('codProduto') codProdutoQ?: string,
    @Query('id') idQ?: string, // compat
  ) {
    const raw = (codProdQ ?? codProdutoQ ?? idQ ?? '').trim();
    if (!raw) throw new BadRequestException('Informe codProd (ou codProduto / id) na query.');

    const codProd = Number(raw);
    if (!Number.isFinite(codProd)) throw new BadRequestException('codProd inválido.');

    return this.syncService.getProduct(codProd);
  }

  @Post('updateProductLocation')
  async updateProductLocation(
    @Query('id') idString: number,
    @Query('location') locationString: string,
    @Query('userEmail') userEmail: string,
  ) {
    //const system = "SYSTEM";
    return this.syncService.updateProductLocation(idString, locationString, userEmail);
  }

  @Post('updateProductLocation2')
  async updateProductLocation2(
    @Query('id') idString: number,
    @Query('location') locationString: string,
    @Query('userEmail') userEmail: string,
  ) {
    return this.syncService.updateProductLocation2(idString, locationString, userEmail);
  }

  @Post('updateQtdMax')
  async updateQtdMax(
    @Query('id') idString: number,
    @Query('quantidade') quantidadeNumber: number,
    @Query('userEmail') userEmail: string,
  ) {
    return this.syncService.updateQtdMax(idString, quantidadeNumber, userEmail);
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
    return this.syncService.addCount(dto.codProd, dto.contagem, dto.descricao, dto.localizacao, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addCount2')
  async addCount2(
    @Body() dto: { codProd: number; contagem: number; descricao: string; localizacao: string, reservado?: number },
    @Req() req: any,
  ) {
    return this.syncService.addCount2(dto.codProd, dto.contagem, dto.descricao, dto.localizacao, dto.reservado ?? 0, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addNewCount')
  async addNewCount(
    @Body() dto: { codProd: number; contagem: number; descricao: string; localizacao: string, reservado?: number },
    @Req() req: any,
  ) {
    return this.syncService.addNewCount(dto.codProd, dto.contagem, dto.descricao, dto.localizacao, dto.reservado ?? 0, req.user.email);
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

  @UseGuards(JwtAuthGuard)
  @Post('updateInventoryDate')
  async updateInventoryDate(@Body() body: { count: number, codProd: number, id: string }, @Req() req: any) {
    return this.syncService.postInplantCount(body.count, body.codProd, body.id, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('inplantCount')
  async inplantCount(@Body() body: { diference: number, codProd: number, id: string }, @Req() req: any) {
    return this.syncService.postInplantCount(body.diference, body.codProd, body.id, req.user.email);
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
  async alterarSenha(@Body() body: { newPassword: string }, @Req() req: any) {
    return this.syncService.alterarSenha(req.user.email, body.newPassword);
  }

  @Post('adicionarSeparador')
  async adicionarSeparador(@Body() body: { userEmail: string, estoque: string }) {
    return this.syncService.adicionarSeparador(body.userEmail, body.estoque);
  }

  @Post('removerSeparador')
  async removerSeparador(@Body() body: { userEmail: string, estoque: string }) {
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
  async getEstoqueById(@Query('region') region: string) {
    return this.syncService.getEstoqueById(region);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getNotaSeparacao')
  async getNotaSeparacao(@Req() req: any) {
    const token = await this.sankhyaService.login();
    return this.sankhyaService.NotasPendentesDeSeparacao(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getNotasPendentesConferencia')
  async getNotasPendentesConferencia(@Req() req: any) {
    const token = await this.sankhyaService.login();
    return this.sankhyaService.getNotasStatusConferenciaA(token);
  }

  @Get('getUsuarios')
  async getUsuarios() {
    return this.syncService.getUsuarios();
  }

  @UseGuards(JwtAuthGuard)
  @Post('changeRole')
  async changeRole(@Body() body: { userEmail: string, role: string }, @Req() req: any) {
    return this.syncService.changeRole(body.userEmail, body.role, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('criarUsuario')
  async criarUsuario(@Body() body: { email: string, senha: string }, @Req() req: any) {
    return this.syncService.criarUsuario(body.email, body.senha, req.user.email);
  }


  @Get('getNotaPositiva')
  async getNotaPositva() {
    return this.syncService.getNotaPositiva();
  }

  @UseGuards(JwtAuthGuard)
  @Post('ajustePositivo')
  async ajustePositivo(
    @Body() body: { produtos: { codProd: number; diference: number }[] },
    @Req() req: any,
  ) {
    return this.syncService.ajustePositivo(body.produtos, req.user.email);
  }

  @Get('getNotaNegativa')
  async getNotaNegativa() {
    return this.syncService.getNotaNegativa();
  }

  @UseGuards(JwtAuthGuard)
  @Post('ajusteNegativo')
  async ajusteNegativo(
    @Body() body: { produtos: { codProd: number; diference: number }[] },
    @Req() req: any,
  ) {
    return this.syncService.ajusteNegativo(body.produtos, req.user.email);
  }

  @Get('getNotaNegativaCorrecao')
  async getNotaNegativaCorrecao() {
    return this.syncService.getNotaNegativaCorrecao();
  }

  @Get('getNotaPositivaCorrecao')
  async getNotaPositivaCorrecao() {
    return this.syncService.getNotaPositivaCorrecao();
  }

  @UseGuards(JwtAuthGuard)
  @Post('retornarProdutos')
  async retornarProdutos(@Body() body: { codProds: number[] }, @Req() req: any) {
    return this.syncService.retornarProdutos(body.codProds, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cadastrarCodBarras')
  async cadastrarCodBarra(@Body() body: { codBarras: number, codProduto: number }, @Req() req: any) {
    return this.syncService.cadastarCodBarras(body.codBarras, body.codProduto, req.user.email);
  }

  @Post('solicitarProduto')
  async solicitaProduto(@Body() body: { produtos: { codProduto: number; quantidade: number; descricao: string }[], userEmail: string },) {
    return this.syncService.solicitaProdutos(body.userEmail, body.produtos);
  }

  @Get('getSolicitacao')
  async getSolicitacao() {
    return this.syncService.getSolicitacao();
  }

  @Get('getSolicitacaoUser')
  async getSolicitacaoUser(@Query('userEmail') userEmail: string) {
    return this.syncService.getSolicitacaoUser(userEmail);
  }


  @Post('aprovarSolicitacao')
  async aprovarSolicitacao(@Body() body: { produtos: { codProduto: number; quantidade: number; descricao: string }[], id: string, userEmail }) {
    const token = await this.sankhyaService.login();
    return this.syncService.aprovarSolicitacao(body.produtos, body.id, body.userEmail, token);
  }

  @Post('reprovarSolicitacao')
  async reprovarSolicitacao(@Body() body: { produtos: { codProduto: number; quantidade: number; descricao: string }[], id: string, userEmail }) {
    const token = await this.sankhyaService.login();
    return this.syncService.reprovarSolicitacao(body.produtos, body.id, body.userEmail, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('criarCodigoBarras')
  async adicionarCodigoBarras(@Body() body: { codProduto: number, codBarras: number }, @Req() req: any) {
    return this.syncService.cadastarCodBarras(body.codBarras, body.codProduto, req.user.email);
  }


  @Get('synccurvaProduto')
  async synccurvaProduto() {
    const token = await this.sankhyaService.login();

    return this.syncService.synccurvaProdutoProdutos(token);
  }

  @Get('getCurvas')
  async getCurvas() {
    return this.syncService.getCurvas();
  }

  @Get('getCurvaById')
  async getCurvaById(@Query('codProd') codProduto: String) {
    console.log(codProduto)
    const codigo = Number(codProduto);
    return this.syncService.getCurvaById(codigo);
  }

  @Get('getCodBarras')
  async getCodBarras(@Query('codProd') codProduto: number) {
    return this.syncService.getCodBarras(codProduto)
  }

  @Get('getNotasNaoConfirmadas')
  async getNotasNaoConfirmadas() {
    return this.syncService.listarNotasNaoConfirmadas();
  }


  @UseGuards(JwtAuthGuard)
  @Post('resetarSenha')
  async resetarSenha(@Body() body: { userEmail: string }, @Req() req: any) {
    return this.syncService.resetSenha(body.userEmail, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('excluirUsuario')
  async excluirUsuario(@Body() body: { userEmail: string }, @Req() req: any) {
    return this.syncService.deleteUsuario(body.userEmail, req.user.email);
  }

  @Get('getAllNotasTV')
  async getAllNotasTV() {
    return this.syncService.listarNotasTV();
  }

  @Get('getNotasLoja')
  async getNotasLoja() {
    return this.syncService.getNotasLoja();
  }


  @Get('getAllNotasTVAberta')
  async getAllNotasTVAberta(){
    return this.syncService.listarNotasTVAberta();
  }

  @UseGuards(JwtAuthGuard)
  @Post('createErroEstoque')
  async createErroEstoque(@Body() body: { codProd: number, descricao: string }, @Req() req: any) {
    return this.syncService.createErroEstoque(req.user.email, body.codProd, body.descricao);
  }

  @Get('getAllErroEstoque')
  async getAllErroEstoque(){
    return this.syncService.getAllErroEstoque();
  }

  @UseGuards(JwtAuthGuard)
  @Post('createErroEstoque')
  async correcaoErroEstoque(@Body() body: { codProd: number, descricao: string }, @Req() req: any) {
    return this.syncService.createErroEstoque(req.user.email, body.codProd, body.descricao);
  }

  @UseGuards(JwtAuthGuard)
  @Post('finalizarErroEstoque')
  async finalizarErroEstoque(@Body() body: { id: string }, @Req() req: any) {
    return null;
  }




}

