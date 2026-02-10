import { Controller, Body, Post, Get, Query, BadRequestException, UseGuards, Req, Res, Put } from '@nestjs/common'; // Importe 'Query' e 'BadRequestException'
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService as PrismaService } from '../Prisma/prisma.service';
import { SankhyaService } from '../Sankhya/sankhya.service'; // Importe o serviço Service
import { Response } from 'express';


import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export type LocalizacoesDTO = {
  Rua: string;
  Predio: string;
  Nivel: string;
  Apartamento: string;
  Endereco: string;
  Armazenamento: string;
};


type ProdutoDto = {
  CODPROD: number;
  DESCRPROD: string | null;
  CODBARRA?: string | null;

  CODGRUPOPROD?: number | null;
  DESCRGRUPOPROD?: string | null;

  MARCA?: string | null;
  ATIVO?: any;

  CODBARRAS?: string[];
};



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
    return this.syncService.aprovarSolicitacao(body.produtos, body.id, body.userEmail,);
  }

  @Post('reprovarSolicitacao')
  async reprovarSolicitacao(@Body() body: { produtos: { codProduto: number; quantidade: number; descricao: string }[], id: string, userEmail }) {
    return this.syncService.reprovarSolicitacao(body.id, body.userEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Post('criarCodigoBarras')
  async adicionarCodigoBarras(@Body() body: { codProduto: number, codBarras: number }, @Req() req: any) {
    return this.syncService.cadastarCodBarras(body.codBarras, body.codProduto, req.user.email);
  }


  @Get('synccurvaProduto')
  async synccurvaProduto() {
    return this.syncService.synccurvaProdutoProdutos();
  }

  @Get('getCurvas')
  async getCurvas() {
    return this.syncService.getCurvas();
  }

  @Get('getCurvaById')
  async getCurvaById(@Query('codProd') codProduto: String) {
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

  @Get('getNotasExpedicao')
  async getNotasExpedicao() {
    return this.syncService.getNotasExpedicao();
  }

  @Get('getNotasSeparacao')
  async getNotasSeparacao() {
    return this.syncService.getNotasSeparacao();
  }


  @Get('getNotasLoja')
  async getNotasLoja() {
    return this.syncService.getNotasLoja();
  }

  @Get('getNotasDfarias')
  async getNotasDfarias() {
    return this.syncService.getNotasDfarias();
  }

  @Get('getAllNotasTV')
  async getAllNotasTV() {
    return this.syncService.getAllNotasTV();
  }

  @Get('getFilaCabos')
  async getFilaCabos() {
    return this.syncService.listarFilaCabos();
  }

  @UseGuards(JwtAuthGuard)
  @Post('createErroEstoque')
  async createErroEstoque(@Body() body: { codProd: number, descricao: string }, @Req() req: any) {
    return this.syncService.createErroEstoque(req.user.email, body.codProd, body.descricao);
  }

  @Get('getAllErroEstoque')
  async getAllErroEstoque() {
    return this.syncService.getAllErroEstoque();
  }

    @Get('getAllAuditorias')
  async getAllAuditorias() {
    return this.syncService.getAllAuditorias();
  }

  @UseGuards(JwtAuthGuard)
  @Post('correcaoErroEstoque')
  async correcaoErroEstoque(@Body() body: { codProd: number, valor: number }, @Req() req: any) {
      console.log(body)
    return this.syncService.correcaoErroEstoque(body.codProd, body.valor, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('finalizarErroEstoque')
  async finalizarErroEstoque(@Body() body: { id: string, descricao: string }, @Req() req: any) {
    return this.syncService.finalizarErroEstoque(body.id, body.descricao, req.user.email);
  }

  @Post('imprimirEtiquetaCabo')
  async imprimirEtiquetaCabo(@Body() body: { nunota: number, parceiro: string, vendedor: string, codprod: number, descrprod: string, qtdneg: number, sequencia: number }, @Res() res: Response) {
    const pdfBuffer = await this.syncService.imprimirEtiqueta(body.nunota, body.parceiro, body.vendedor, body.codprod, body.descrprod, body.qtdneg, body.sequencia);// ✅ await

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="etiqueta.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer); 
  }

  @Post('impresso')
  async impresso(@Body() body: { nunota: number, parceiro: string, vendedor: string, codprod: number, descrprod: string, qtdneg: number }, @Res() res: Response) {
    await this.syncService.impresso(body.nunota, body.codprod);
    return null;
  }

  @Post('adImpresso')
  async adImpresso(@Body() body: { nunota: number, codprod: number }, @Res() res: Response) {
    await this.syncService.impresso(body.nunota, body.codprod);
    return null;
  }

  @Post('emSeparacao')
  async emSeparacao(@Body() body: { nunota: number, dtneg: string, hrneg: string }) {
    return await this.syncService.emSeparacao(body.nunota, body.dtneg, body.hrneg)
  }

  @Post('desSeparacao')
  async desSeparacao(@Body() body: { nunota: number }) {
    return this.syncService.desSeparacao(body.nunota)
  }

  @Get('getAllProdutos')
  async getAllProdutos() {
    return this.syncService.getAllProdutos();
  }

  @Post('cadastrarProdutosIfood')
  async cadastrarProdutosIfood(@Body() body: { produtos?: ProdutoDto[] }) {
    const produtos = Array.isArray(body?.produtos) ? body.produtos : [];
    return await this.syncService.cadastrarProdutosIfood(produtos);
  }


  @Post('importLocalizacoes')
  async importMany(@Body() body: { items: LocalizacoesDTO[] }) {
    const items = body?.items ?? [];
    return this.syncService.updateLocalizacoes(items);
  }

  @Get('getAllLocalizacoes')
  async getAllLocalizacoes() {
    return null;
  }

  @Get('imprimirEtiquetaLocalizacao')
  async imprimirEtiquetaLocalizacao(
    @Query() q: Partial<LocalizacoesDTO>,
    @Res() res: Response,
  ) {
    const item: LocalizacoesDTO = {
      Rua: String(q.Rua ?? '').trim(),
      Predio: String(q.Predio ?? '').trim(),
      Nivel: String(q.Nivel ?? '').trim(),
      Apartamento: String(q.Apartamento ?? '').trim(),
      Endereco: String(q.Endereco ?? '').trim(),
      Armazenamento: String(q.Armazenamento ?? '').trim(),
    };

    if (!item.Endereco || !item.Armazenamento) {
      res.status(400).json({ message: 'Endereco e Armazenamento são obrigatórios.' });
      return;
    }

    // 👉 este método deve existir no seu SyncService e retornar Buffer do PDF
    const pdfBuffer = await this.syncService.imprimirEtiquetaLoc(item);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="localizacao-${item.Endereco}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }

  @Post('getAllEtiquetasCabos')
  async getAllEtiquetasCabos(
    @Query('payload') payload: string | undefined,
    @Res() res: Response,
  ) {

    const pdfBuffer = await this.syncService.imprimirEtiquetaLocMulti();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="etiquetas-localizacoes.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }

 @Get('imprimirEtiquetaLid')
  async imprimirEtiquetaLid(
    @Query() query: { 
        nunota: string; 
        parceiro: string; 
        vendedor: string; 
        codprod?: string; 
        descrprod: string; 
        qtd_negociada: string; 
        sequencia?: string;
    }, 
    @Res() res: Response
  ) {
    // 1. Converter os parâmetros que vêm como string na URL para os tipos corretos
    const nunota = Number(query.nunota);
    const codprod = query.codprod ? Number(query.codprod) : 0; // Trata caso não venha
    const qtdneg = Number(query.qtd_negociada); // Frontend envia como 'qtd_negociada'
    const sequencia = query.sequencia ? Number(query.sequencia) : 0;

    // 2. Chamar o serviço (Reutilizando a lógica existente ou chamando um método específico se houver)
    const pdfBuffer = await this.syncService.imprimirEtiquetaLid(
        nunota, 
        query.parceiro, 
        query.vendedor, 
        codprod, 
        query.descrprod, 
        qtdneg, 
        sequencia
    );

    // 3. Configurar Headers para retorno do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="etiqueta_lid.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    await this.syncService.impresso(nunota, sequencia)

    // 4. Retornar o Buffer
    return res.end(pdfBuffer);
  }


  @Post('teste')
  async teste() {
    return null;
  }

  @Get('produtos')
  async listarProdutos(
    @Query('groupId') groupId?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.syncService.listarProdutosSankhya({
      groupId: groupId ? Number(groupId) : undefined,
      manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
      search: search?.trim() || undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('listarItensPendentes')
  async listarPendentes() {
    return this.syncService.listarItensPendentes();
  }

  @Get('listarItensNotaLid')
  async listarItensNotaLid(@Query('nunota') nunota: number) {
    return this.syncService.listarItensNotaLid(nunota);
  }
  @Get('pedidosLid')
  async pedidosLid() {
    return this.syncService.pedidosLid();
  }

  @Get('valorRoleta')
  async getValor(@Query('codigo') codigo: string) {
    // Lógica para sortear o ID de 1 a 9
    return this.syncService.valorRoleta(codigo)
  }

  @Get('validarCodigoRoleta')
  async validarCodigoRoleta(@Query('codigo') codigo: string) {
    const validar = await this.syncService.validarCodigo(codigo);
    console.log(validar)
    return {ok: validar[0], msg: validar[1]}
  }

  @Post('usarCodigoRoleta')
  async usarCodigoRoleta(@Body() body: {codigo: string}) {
    return this.syncService.codigoRoletaUsado(body.codigo);
  }


  @Put('criarSolicitacaoTI')
  async criarSolicitacaoTI(@Body() dto: { solicitacao: string, descricao: string}){
    return await this.syncService.criarSolicitacaoTI(dto.solicitacao, dto.descricao);
  }

  @Get('getDemandasTI')
  async getDemandasTI() {
    return this.syncService.getDemandasTI();
  }


  @Get('getAllDemandasTI')
  async getAllDemandasTI() {
    return this.syncService.getAllDemandasTI();
  }

  @Post('atualizarDemanda')
  async atualizarDemanda(@Body() body: { id: number, comentario: string, status: string}) {
    return this.syncService.updateDemandaTI(body.id, body.comentario, body.status);
  }

  @Get('getNotaByNunota')
  async getNotaByNunota(@Query('nunota') nunota: string) {
    return this.syncService.getNotaPorNunota(nunota);
  }

  @Get('getRelatorioIncentivo')
  async getRelatorioIncentivo(    @Query('dtIni') dtIni: string,
    @Query('dtFin') dtFin: string,
    @Query('cfops') cfops: number[],
) {
    return this.syncService.getRelatorioIncentivo(dtIni, dtFin, cfops);
  }

}

