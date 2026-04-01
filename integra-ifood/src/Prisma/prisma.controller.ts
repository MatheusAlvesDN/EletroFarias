import { 
  Controller, Body, Post, Get, Query, BadRequestException, 
  UseGuards, Req, Put, Delete, 
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { PrismaService } from './prisma.service'; // Ajuste o caminho conforme necessário
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

// Tipagens locais (podem ser extraídas para um arquivo de DTO)
type ItemSolicitacaoDto = {
  codProduto: number;
  quantidade: number;
  descricao: string;
};

type LocalizacoesDto = {
  Rua: string;
  Predio: string;
  Nivel: string;
  Apartamento: string;
  Endereco: string;
  Armazenamento: string;
};

@Controller('prisma') // ou 'users', 'database', etc. dependendo de como você organizou
export class PrismaController {
  constructor(private readonly prismaService: PrismaService) {}

  //#region Usuários e Autenticação

  @Post('createUser')
  async createUser(@Body() body: { email: string; passwordHash: string }) { // Nota: o service espera password que será hasheada
    return this.prismaService.createUser(body.email, body.passwordHash);
  }

  @Get('findByEmail')
  async findByEmail(@Query('email') email: string) {
    if (!email) throw new BadRequestException('E-mail é obrigatório');
    return this.prismaService.findByEmail(email);
  }

  @Post('loginSession')
  async loginSession(@Body() body: { userEmail: string }) {
    return this.prismaService.loginSession(body.userEmail);
  }

  @Post('logoutSession')
  async logoutSession(@Body() body: { userEmail: string }) {
    return this.prismaService.logoutSession(body.userEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Post('alterarSenha')
  async alterarSenha(@Body() body: { senhaNova: string }, @Req() req: any) {
    return this.prismaService.alterarSenha(req.user.email, body.senhaNova);
  }

  @Get('getLogins')
  async getLogins() {
    return this.prismaService.getLogins();
  }

  //#endregion

  //#region Admin

  @Get('getUsuarios')
  async getUsuarios() {
    return this.prismaService.getUsuarios();
  }

  @Post('changeRole')
  async changeRole(@Body() body: { userEmail: string; role: string }) {
    return this.prismaService.changeRole(body.userEmail, body.role);
  }

  @Post('resetSenha')
  async resetSenha(@Body() body: { userEmail: string }) {
    return this.prismaService.resetSenha(body.userEmail);
  }

  @Post('deleteUsuario')
  async deleteUsuario(@Body() body: { userEmail: string }) {
    return this.prismaService.deleteUsuario(body.userEmail);
  }

  @Post('updateAcessos')
  async updateAcesso(@Body() body: { userEmail: string, acessos: string[] }) {
    return this.prismaService.updateAcessos(body.userEmail, body.acessos);
  }

  //#endregion

  //#region Rewards e Débitos

  @Post('createRegisterReward')
  async createRegisterReward(@Body() body: { idVoucher: string; cpf: string; value_r: number }) {
    return this.prismaService.createRegisterReward(body.idVoucher, body.cpf, body.value_r);
  }

  @Delete('deleteReward')
  async deleteReward(@Query('idVoucher') idVoucher: string) {
    return this.prismaService.deleteReward(idVoucher);
  }

  @Get('findReward')
  async findReward(@Query('idVoucher') idVoucher: string) {
    return this.prismaService.findReward(idVoucher);
  }

  @Post('registerDebit')
  async registerDebit(@Body() body: { cpf: string; value: number; desc: string; nomeParc: string; nunota: string }) {
    return this.prismaService.registerDebit(body.cpf, body.value, body.desc, body.nomeParc, body.nunota);
  }

  @Get('findDebit')
  async findDebit(@Query('cpf') cpf: string) {
    return this.prismaService.findDebit(cpf);
  }

  @Post('addDebit')
  async addDebit(@Body() body: { id: string; addValue: number }) {
    return this.prismaService.addDebit(body.id, body.addValue);
  }

  @Post('reduceDebit')
  async reduceDebit(@Body() body: { id: string; removeValue: number }) {
    return this.prismaService.reduceDebit(body.id, body.removeValue);
  }

  @Delete('deleteDebit')
  async deleteDebit(@Query('id') id: string) {
    return this.prismaService.deleteDebit(id);
  }

  //#endregion

  //#region Inventário e Contagens

  @UseGuards(JwtAuthGuard)
  @Post('addCount')
  async addCount(
    @Body() dto: { codProd: number; count: number; inStock: number; descricao: string; localizacao: string },
    @Req() req: any,
  ) {
    return this.prismaService.addCount(dto.codProd, dto.count, dto.inStock, req.user.email, dto.descricao, dto.localizacao);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addCount2')
  async addCount2(
    @Body() dto: { codProd: number; count: number; inStock: number; descricao: string; localizacao: string; reservado: number },
    @Req() req: any,
  ) {
    return this.prismaService.addCount2(dto.codProd, dto.count, dto.inStock, req.user.email, dto.descricao, dto.localizacao, dto.reservado);
  }

  @Get('getInventoryWhere')
  async getInventoryWhere(@Query('codProd') codProdStr: string) {
    const codProd = Number(codProdStr);
    if (isNaN(codProd)) throw new BadRequestException('codProd inválido');
    return this.prismaService.getInventoryWhere(codProd);
  }

  @Get('getInventory')
  async getInventory(@Query('id') id: string) {
    return this.prismaService.getInventory(id);
  }

  @Get('getInventoryList')
  async getInventoryList() {
    return this.prismaService.getInventoryList();
  }

  @Get('getProductsByLocation')
  async getProductsByLocation(@Query('localizacao') localizacao: string) {
    return this.prismaService.getProductsByLocation(localizacao);
  }

  @UseGuards(JwtAuthGuard)
  @Post('updateInventoryDate')
  async updateInventoryDate(@Body() body: { id: string; inplantedDate: string }, @Req() req: any) {
    return this.prismaService.updateInventoryDate(body.id, body.inplantedDate, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addNewCount')
  async addNewCount(
    @Body() dto: { codProd: number; count: number; inStock: number; descricao: string; localizacao: string; reservado: number },
    @Req() req: any,
  ) {
    return this.prismaService.addNewCount(dto.codProd, dto.count, dto.inStock, req.user.email, dto.descricao, dto.localizacao, dto.reservado);
  }

  @Get('getCurvas')
  async getCurvas() {
    return this.prismaService.getCurvas();
  }

  @Get('getCurvaById')
  async getCurvaById(@Query('codProd') codProdStr: string) {
    const codProd = Number(codProdStr);
    return this.prismaService.getCurvaById(codProd);
  }

  @Post('updateCurva')
  async updateCurva(@Body() body: { codProd: number; curva: string; descricao: string }) {
    return this.prismaService.updateCurva(body.codProd, body.curva, body.descricao);
  }

  //#endregion

  //#region Estoque (Erros e Auditoria)

  @UseGuards(JwtAuthGuard)
  @Post('createErroEstoque')
  async createErroEstoque(@Body() body: { codProd: number; descricao: string }, @Req() req: any) {
    return this.prismaService.createErroEstoque(req.user.email, body.codProd, body.descricao);
  }

  @Get('getAllErroEstoque')
  async getAllErroEstoque() {
    return this.prismaService.getAllErroEstoque();
  }

  @UseGuards(JwtAuthGuard)
  @Post('finalizarErroEstoque')
  async finalizarErroEstoque(@Body() body: { id: string; descricao: string }, @Req() req: any) {
    return this.prismaService.finalizarErroEstoque(body.id, body.descricao, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('createAuditoria')
  async createAuditoria(
    @Body() dto: { codProd: number; count: number; inStock: number; reservado: number; descricao: string },
    @Req() req: any
  ) {
    return this.prismaService.createAuditoria(dto.codProd, dto.count, dto.inStock, dto.reservado, req.user.email, dto.descricao);
  }

  @Get('getAllAuditorias')
  async getAllAuditorias() {
    return this.prismaService.getAllAuditorias();
  }

  @Get('getAuditoriasByDate')
  async getAuditoriasByDate() {
    return this.prismaService.getAuditoriasByDate();
  }

  //#endregion

  //#region NotFound e MultiLocation

  @Post('createNotFound')
  async createNotFound(@Body() body: { localizacao: string; produtosFaltando: number[]; produtosContados: number[] }) {
    return this.prismaService.createNotFound(body.localizacao, body.produtosFaltando, body.produtosContados);
  }

  @Post('updateNotFoundList')
  async updateNotFoundList(@Body() body: { localizacao: string; produtosFaltando: number[]; produtosContados: number[] }) {
    return this.prismaService.updateNotFoundList(body.localizacao, body.produtosFaltando, body.produtosContados);
  }

  @Get('getNotFound')
  async getNotFound(@Query('localizacao') localizacao: string) {
    return this.prismaService.getNotFound(localizacao);
  }

  @Get('getNotFoundList')
  async getNotFoundList() {
    return this.prismaService.getNotFoundList();
  }

  @Get('getMultiLocation')
  async getMultiLocation() {
    return this.prismaService.getMultiLocation();
  }

  //#endregion

  //#region Triagem / Separadores

  @Get('getSeparadores')
  async getSeparadores() {
    return this.prismaService.getSeparadores();
  }

  @Get('getPedidoSeparador')
  async getPedidoSeparador(@Query('userEmail') userEmail: string) {
    return this.prismaService.getPedidoSeparador(userEmail);
  }

  @Post('adicionarSeparador')
  async adicionarSeparador(@Body() body: { userEmail: string; region: string }) {
    return this.prismaService.adicionarSeparador(body.userEmail, body.region);
  }

  @Post('removerSeparador')
  async removerSeparador(@Body() body: { userEmail: string; region: string }) {
    return this.prismaService.removerSeparador(body.userEmail, body.region);
  }

  @Get('getEstoqueById')
  async getEstoqueById(@Query('region') region: string) {
    return this.prismaService.getEstoqueById(region);
  }

  @Get('getEstoque')
  async getEstoque() {
    return this.prismaService.getEstoque();
  }

  //#endregion

  //#region Ajustes e Lançamentos de Notas

  @Get('getNotaPositiva')
  async getNotaPositiva() {
    return this.prismaService.getNotaPositiva();
  }

  @Get('getNotaNegativa')
  async getNotaNegativa() {
    return this.prismaService.getNotaNegativa();
  }

  @Get('getNotaPositivaCorrecao')
  async getNotaPositivaCorrecao() {
    return this.prismaService.getNotaPositivaCorrecao();
  }

  @Get('getNotaNegativaCorrecao')
  async getNotaNegativaCorrecao() {
    return this.prismaService.getNotaNegativaCorrecao();
  }

  @Post('incluirNota')
  async incluirNota(@Body() body: { produtos: { codProd: number; diference: number }[] }) {
    return this.prismaService.incluirNota(body.produtos);
  }

  @Post('retornarProdutos')
  async retornarProdutos(@Body() body: { codProds: number[] }) {
    return this.prismaService.retornarProdutos(body.codProds);
  }

  //#endregion

  //#region Solicitações de Produto

  @UseGuards(JwtAuthGuard)
  @Post('solicitaProduto')
  async solicitaProduto(@Body() body: { items: ItemSolicitacaoDto[] }, @Req() req: any) {
    return this.prismaService.solicitaProduto(req.user.email, body.items);
  }

  @Get('getSolicitacao')
  async getSolicitacao() {
    return this.prismaService.getSolicitacao();
  }

  @Get('getSolicitacaoUsuario')
  async getSolicitacaoUsuario(@Query('userEmail') userEmail: string) {
    return this.prismaService.getSolicitacaoUsuario(userEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Post('baixaSolicitacao')
  async baixaSolicitacao(@Body() body: { id: string }, @Req() req: any) {
    return this.prismaService.baixaSolicitacao(body.id, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reprovarSolicitacao')
  async reprovarSolicitacao(@Body() body: { id: string }, @Req() req: any) {
    return this.prismaService.reprovarSolicitacao(body.id, req.user.email);
  }

  //#endregion

  //#region Demandas TI e Outros

  @Post('createSolicitacaoTI')
  async createSolicitacaoTI(@Body() body: { solicitacao: string; descricao: string }) {
    return this.prismaService.createSolicitacaoTI(body.solicitacao, body.descricao);
  }

  @Get('getDemandasTI')
  async getDemandasTI() {
    return this.prismaService.getDemandasTI();
  }

  @Get('getAllDemandasTI')
  async getAllDemandasTI() {
    return this.prismaService.getAllDemandasTI();
  }

  @Post('updateDemandaTI')
  async updateDemandaTI(@Body() body: { id: number; comentario: string; status: string }) {
    return this.prismaService.updateDemandaTI(body.id, body.comentario, body.status);
  }

  @Post('usarCodigoRoleta')
  async usarCodigoRoleta(@Body() body: { codigo: string }) {
    return this.prismaService.usarCodigoRoleta(body.codigo);
  }

  @Get('verificarCodigoRoleta')
  async verificarCodigoRoleta(@Query('codigo') codigo: string) {
    const isValid = await this.prismaService.verificarCodigoRoleta(codigo);
    return { valido: isValid };
  }

  //#endregion

  //#region Localizações

  @Post('createLocalizacoes')
  async createLocalizacoes(@Body() body: { localizacao: LocalizacoesDto }) {
    return this.prismaService.createLocalizacoes(body.localizacao);
  }

  @Get('getAllLocalizacoes')
  async getAllLocalizacoes() {
    return this.prismaService.getAllLocalizacoes();
  }

  @Post('updateLocalizacoes')
  async updateLocalizacoes(@Body() body: { items: LocalizacoesDto[] }) {
    return this.prismaService.updateLocalizacoes(body.items);
  }

  @Delete('deleteLocalizacoes')
  async deleteLocalizacoes(@Query('id') id: string) {
    return this.prismaService.deleteLocalizacoes(id);
  }

  @Delete('deleteAllLocalizacoes')
  async deleteAllLocalizacoes() {
    return this.prismaService.deleteAllLocalizacoes();
  }

  //#endregion
  
  @Get('getRegrasAliquota')
  async getRegrasAliquota() {
    return this.prismaService.getAllRegras();
  }

@Post('criarRegra')
  async criarRegra(@Body() body: { 
    cfop: string, 
    tributacao: string, 
    aliquota?: string, 
    descricao?: string, 
    aliquotaICMS?: string, 
    baseICMS?: string 
  }) {
    return this.prismaService.criarRegra(
      body.cfop, 
      body.tributacao, 
      body.aliquota, 
      body.descricao, 
      body.aliquotaICMS,
      body.baseICMS
    );
  }

  @Put('alterarRegra')
  async alterarRegra(
    @Body() body: { 
      id: number; 
      cfop: string; 
      tributacao: string; 
      aliquota?: string; 
      descricao?: string; 
      aliquotaICMS?: string;
      baseICMS?: string;
    }
  ) {
    return this.prismaService.alterarRegra(
      body.id, 
      body.cfop, 
      body.tributacao, 
      body.aliquota, 
      body.descricao, 
      body.aliquotaICMS,
      body.baseICMS
    );
  }
  @Delete('excluirRegra')
  async excluirRegra(@Body() body: { id: number }) {
    return this.prismaService.excluirRegra(body.id);
  }

  @Post('ncm/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNcmCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado. Certifique-se de usar o campo "file".');
    }

    // Validação básica do mimetype
    if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Formato de arquivo inválido. Por favor, envie um arquivo .csv.');
    }

    const resultado = await this.prismaService.processarCsvNcm(file.buffer);

    return {
      message: 'Arquivo importado e salvo no banco de dados com sucesso.',
      detalhes: resultado,
    };
  }

   @Get('getAllNcm')
   async getAllNCM(){
    return this.prismaService.getAllNcm();
   }


}