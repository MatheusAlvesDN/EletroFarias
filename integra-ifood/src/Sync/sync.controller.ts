import { Controller, Body, Post, Get, Query, BadRequestException, UseGuards, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common'; // Importe 'Query' e 'BadRequestException'
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
  ) {}

  // Cria uma categoria vinculada a um produto pelo ID informado na query (?id=)
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

  // Deleta uma categoria vinculada a um produto pelo ID informado na query (?id=)
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

  // Endpoint reservado para atualização de EAN (ainda não implementado)
  @Post('updateEAN')
  async updateEAN() {}

  // Retorna todas as categorias cadastradas
  @Post('getAllCategories')
  async getAllCategories() {
    return this.syncService.getAllCategories();
  }

  // Retorna a localização do produto pelo id informado na query (?id=)
  @Get('getProductLocation')
  async getProductLocation(@Query('id') idString: number) {
    return this.syncService.getProductLocation(idString);
  }

  // Busca um produto pelo codProd (aceita também codProduto ou id por compatibilidade)
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

  // Atualiza a localização do produto (id + location via query)
  @Post('updateProductLocation')
  async updateProductLocation(
    @Query('id') idString: number,
    @Query('location') locationString: string,
  ) {
    return this.syncService.updateProductLocation(idString, locationString);
  }

  // Atualiza a localização do produto (variação 2 / regra alternativa no service)
  @Post('updateProductLocation2')
  async updateProductLocation2(
    @Query('id') idString: number,
    @Query('location') locationString: string,
  ) {
    return this.syncService.updateProductLocation2(idString, locationString);
  }

  // Atualiza a quantidade máxima (AD_QTDMAX) do produto (id + quantidade via query)
  @Post('updateQtdMax')
  async updateQtdMax(
    @Query('id') idString: number,
    @Query('quantidade') quantidadeNumber: number,
  ) {
    return this.syncService.updateQtdMax(idString, quantidadeNumber);
  }

  // Registra/Processa um resgate (reward) recebendo payload no body
  @Post('claimReward')
  async claimReward(@Body() payload: any) {
    await this.syncService.claimreward(payload);
    console.log('Payload recebido:', payload);
    return { message: 'Resgate recebido com sucesso' };
  }

  // Registra um usuário no sistema com dados enviados no body
  @Post('userRegister')
  async userRegister(@Body() payload: any) {
    console.log('Payload recebido:', payload);
    await this.syncService.registerUser(payload);
  }

  // Adiciona contagem para um produto (com autenticação; usa o email do usuário logado)
  @UseGuards(JwtAuthGuard)
  @Post('addcount')
  async addCount(
    @Body() dto: { codProd: number; contagem: number; descricao: string; localizacao: string },
    @Req() req: any,
  ) {
    return this.syncService.addCount(dto.codProd, dto.contagem, dto.descricao, dto.localizacao, req.user.email);
  }

  // Adiciona contagem (variação 2) suportando reservado (com autenticação; usa email do logado)
  @UseGuards(JwtAuthGuard)
  @Post('addCount2')
  async addCount2(
    @Body() dto: { codProd: number; contagem: number; descricao: string; localizacao: string; reservado?: number },
    @Req() req: any,
  ) {
    return this.syncService.addCount2(
      dto.codProd,
      dto.contagem,
      dto.descricao,
      dto.localizacao,
      dto.reservado ?? 0,
      req.user.email,
    );
  }

  // Adiciona nova contagem (variação 3) suportando reservado (com autenticação; usa email do logado)
  @UseGuards(JwtAuthGuard)
  @Post('addNewCount')
  async addNewCount(
    @Body() dto: { codProd: number; contagem: number; descricao: string; localizacao: string; reservado?: number },
    @Req() req: any,
  ) {
    return this.syncService.addNewCount(
      dto.codProd,
      dto.contagem,
      dto.descricao,
      dto.localizacao,
      dto.reservado ?? 0,
      req.user.email,
    );
  }

  // Retorna a lista de inventário (consulta via PrismaService)
  //@UseGuards(JwtAuthGuard)
  @Get('getinventorylist')
  async getInventoryList() {
    return this.prismaService.getInventoryList();
  }

  // Retorna produtos filtrando por localização (?loc=), normalizando para UPPERCASE
  //@UseGuards(JwtAuthGuard)
  @Get('getProductsByLocation')
  async getProductsByLocation(@Query('loc') loc: string) {
    if (!loc || !loc.trim()) {
      throw new BadRequestException('Parâmetro "loc" é obrigatório');
    }

    const location = loc.trim().toUpperCase();
    return this.syncService.getProductsByLocation(location);
  }

  // Atualiza a data/registro de inventário (encaminha para postInplantCount)
  @Post('updateInventoryDate')
  async updateInventoryDate(@Body() body: { count: number; codProd: number; id: string }) {
    return this.syncService.postInplantCount(body.count, body.codProd, body.id);
  }

  // Realiza o "inplant" (ajuste/implantação) da contagem via diferença enviada no body
  @Post('inplantCount')
  async inplantCount(@Body() body: { diference: number; codProd: number; id: string }) {
    return this.syncService.postInplantCount(body.diference, body.codProd, body.id);
  }

  // Retorna a lista de itens não encontrados
  @Get('notFoundList')
  async getNotFoundList() {
    return this.syncService.getNotFoundList();
  }

  // Gera/retorna lista completa de não encontrados (processamento no service)
  @Post('notFoundListFull')
  async notFoundListFull() {
    return this.syncService.notFoundListFull();
  }

  // Retorna lista de itens com múltiplas localizações
  @Get('multiLocation')
  async getMultiLocation() {
    return this.syncService.getMultiLocation();
  }

  // Inicia sessão de login (marca usuário logado no backend) pelo email recebido
  //@UseGuards(JwtAuthGuard)
  @Post('loginSession')
  async loginSession(@Body() body: { userEmail: string }) {
    return this.syncService.loginSession(body.userEmail);
  }

  // Encerra sessão de login (desmarca usuário) pelo email recebido
  //@UseGuards(JwtAuthGuard)
  @Post('logoutSession')
  async logoutSession(@Body() body: { userEmail: string }) {
    return this.syncService.logoutSession(body.userEmail);
  }

  // Retorna lista de logins/sessões registradas
  @Get('getLogins')
  async getLogins() {
    return this.syncService.getLogins();
  }

  // Altera senha do usuário logado (usa email do token JWT)
  @UseGuards(JwtAuthGuard)
  @Post('alterarSenha')
  async alterarSenha(@Body() body: { newPassword: string }, @Req() req: any) {
    return this.syncService.alterarSenha(req.user.email, body.newPassword);
  }

  // Adiciona um separador para um usuário/estoque informado no body
  @Post('adicionarSeparador')
  async adicionarSeparador(@Body() body: { userEmail: string; estoque: string }) {
    return this.syncService.adicionarSeparador(body.userEmail, body.estoque);
  }

  // Remove um separador para um usuário/estoque informado no body
  @Post('removerSeparador')
  async removerSeparador(@Body() body: { userEmail: string; estoque: string }) {
    return this.syncService.removerSeparador(body.userEmail, body.estoque);
  }

  // Retorna lista de separadores cadastrados
  @Get('getSeparadores')
  async getSeparadores() {
    return this.syncService.getSeparadores();
  }

  // Retorna o pedido do separador pelo email passado na query (?userEmail=)
  @Get('getPedidoSeparador')
  async getPedidoSeparador(@Query('userEmail') userEmail: string) {
    if (!userEmail) {
      throw new BadRequestException('Parâmetro "userEmail" é obrigatório.');
    }

    console.log('syncController/getPedidoSeparador: userEmail = ' + userEmail);

    return this.syncService.getPedidoSeparador(userEmail);
  }

  // Retorna estoque por região/id passado na query (?region=)
  @Get('getEstoqueById')
  async getEstoqueById(@Query('region') region: string) {
    return this.syncService.getEstoqueById(region);
  }

  // Busca notas pendentes de separação na Sankhya (requer JWT; faz login na Sankhya internamente)
  @UseGuards(JwtAuthGuard)
  @Get('getNotaSeparacao')
  async getNotaSeparacao(@Req() req: any) {
    const token = await this.sankhyaService.login();
    return this.sankhyaService.NotasPendentesDeSeparacao(token);
  }

  // Busca notas pendentes de conferência (status A) na Sankhya (requer JWT; faz login na Sankhya internamente)
  @UseGuards(JwtAuthGuard)
  @Get('getNotasPendentesConferencia')
  async getNotasPendentesConferencia(@Req() req: any) {
    const token = await this.sankhyaService.login();
    return this.sankhyaService.getNotasStatusConferenciaA(token);
  }

  // Retorna lista de usuários cadastrados
  @Get('getUsuarios')
  async getUsuarios() {
    return this.syncService.getUsuarios();
  }

  // Altera o papel/role de um usuário (body: userEmail + role)
  @UseGuards(JwtAuthGuard)
  @Post('changeRole')
  async changeRole(@Body() body: { userEmail: string; role: string }, @Req() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado: Somente administradores podem alterar roles.');
    }
    return this.syncService.changeRole(body.userEmail, body.role);
  }

  // Cria usuário com email e senha enviados no body
  @UseGuards(JwtAuthGuard)
  @Post('criarUsuario')
  async criarUsuario(@Body() body: { email: string; senha: string }, @Req() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado: Somente administradores podem criar usuários.');
    }
    return this.syncService.criarUsuario(body.email, body.senha);
  }

  // Retorna nota positiva (provavelmente NUNOTA/registro) via service
  @Get('getNotaPositiva')
  async getNotaPositva() {
    return this.syncService.getNotaPositiva();
  }

  // Executa ajuste positivo (entrada de produtos + diferença) encaminhando req.user
  @Post('ajustePositivo')
  async ajustePositivo(
    @Body() body: { produtos: { codProd: number; diference: number }[] },
    @Req() req: any,
  ) {
    return this.syncService.ajustePositivo(body.produtos, req.user);
  }

  // Retorna nota negativa via service
  @Get('getNotaNegativa')
  async getNotaNegativa() {
    return this.syncService.getNotaNegativa();
  }

  // Executa ajuste negativo (entrada de produtos + diferença) encaminhando req.user
  @Post('ajusteNegativo')
  async ajusteNegativo(
    @Body() body: { produtos: { codProd: number; diference: number }[] },
    @Req() req: any,
  ) {
    return this.syncService.ajusteNegativo(body.produtos, req.user);
  }

  // Retorna nota negativa de correção via service
  @Get('getNotaNegativaCorrecao')
  async getNotaNegativaCorrecao() {
    return this.syncService.getNotaNegativaCorrecao();
  }

  // Retorna nota positiva de correção via service
  @Get('getNotaPositivaCorrecao')
  async getNotaPositivaCorrecao() {
    return this.syncService.getNotaPositivaCorrecao();
  }

  // Retorna produtos informados no array codProds (valida body: { codProds: number[] })
  @Post('retornarProdutos')
  async retornarProdutos(@Body() body: { codProds: number[] }) {
    if (!body || !Array.isArray(body.codProds)) {
      throw new BadRequestException('Envie { codProds: number[] }');
    }

    return this.syncService.retornarProdutos(body.codProds);
  }

  // Cadastra um código de barras para um produto (body: codBarras + codProduto)
  @Post('cadastrarCodBarras')
  async cadastrarCodBarra(@Body() body: { codBarras: number; codProduto: number }) {
    return this.syncService.cadastarCodBarras(body.codBarras, body.codProduto);
  }

  // Solicita produtos (lista de itens) para o usuário informado no body
  @Post('solicitarProduto')
  async solicitaProduto(
    @Body()
    body: { produtos: { codProduto: number; quantidade: number; descricao: string }[]; userEmail: string },
  ) {
    return this.syncService.solicitaProdutos(body.userEmail, body.produtos);
  }

  // Retorna todas as solicitações cadastradas
  @Get('getSolicitacao')
  async getSolicitacao() {
    return this.syncService.getSolicitacao();
  }

  // Retorna solicitações filtrando pelo email do usuário (?userEmail=)
  @Get('getSolicitacaoUser')
  async getSolicitacaoUser(@Query('userEmail') userEmail: string) {
    return this.syncService.getSolicitacaoUser(userEmail);
  }

  // Aprova uma solicitação (faz login na Sankhya para obter token e repassa ao service)
  @Post('aprovarSolicitacao')
  async aprovarSolicitacao(@Body() body: { produtos: { codProduto: number; quantidade: number; descricao: string }[]; id: string; userEmail }) {
    const token = await this.sankhyaService.login();
    return this.syncService.aprovarSolicitacao(body.produtos, body.id, body.userEmail, token);
  }

  // Reprova uma solicitação (faz login na Sankhya para obter token e repassa ao service)
  @Post('reprovarSolicitacao')
  async reprovarSolicitacao(@Body() body: { produtos: { codProduto: number; quantidade: number; descricao: string }[]; id: string; userEmail }) {
    const token = await this.sankhyaService.login();
    return this.syncService.reprovarSolicitacao(body.produtos, body.id, body.userEmail, token);
  }

  // Cria/cadastra código de barras (endpoint duplicado/alias do cadastrarCodBarras)
  @Post('criarCodigoBarras')
  async adicionarCodigoBarras(@Body() body: { codProduto: number; codBarras: number }) {
    return this.syncService.cadastarCodBarras(body.codBarras, body.codProduto);
  }

  // Sincroniza curva de produto (obtém token Sankhya e chama o service de sync)
  @Get('synccurvaProduto')
  async synccurvaProduto(@Req() req: any) {
    // dependendo do teu auth guard, pode vir em req.user / token no header etc.
    const authHeader = req.headers?.authorization ?? '';
    const token = await this.sankhyaService.login();

    // se você já tem método sankhyaService.login(), use ele aqui pra pegar token sankhya
    // por enquanto, assumindo que você vai passar o token sankhya (ou adaptar)
    return this.syncService.synccurvaProdutoProdutos(token);
  }

  // Retorna todas as curvas cadastradas
  @Get('getCurvas')
  async getCurvas(@Req() req: any) {
    return this.syncService.getCurvas();
  }

  // Retorna uma curva pelo código do produto (?codProd=)
  @Get('getCurvaById')
  async getCurvaById(@Query('codProd') codProduto: String) {
    console.log(codProduto);
    const codigo = Number(codProduto);
    return this.syncService.getCurvaById(codigo);
  }

  // Retorna códigos de barras do produto (?codProd=)
  @Get('getCodBarras')
  async getCodBarras(@Query('codProd') codProduto: number) {
    return this.syncService.getCodBarras(codProduto);
  }

  // Lista notas não confirmadas
  @Get('getNotasNaoConfirmadas')
  async getNotasNaoConfirmadas() {
    return this.syncService.listarNotasNaoConfirmadas();
  }
}
