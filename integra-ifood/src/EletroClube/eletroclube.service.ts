import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PrismaService } from '../Prisma/prisma.service';
import { SankhyaService } from '../Sankhya/sankhya.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class EletroClubeService {
    private readonly logger = new Logger(EletroClubeService.name);

    constructor(private prisma: PrismaService, private jwtService: JwtService, private sankhyaService: SankhyaService) { }

    //#region Clientes

    // CREATE - Criar um novo cliente
    async criarCliente(dadosCliente: {
        nome: string;
        cpf: string;
        senha: string;
        codParc: string;
        email: string;
        telefone: string;
    }) {
        return await this.prisma.clienteClube.create({
            data: dadosCliente,
        });
    }

    // READ - Consultar todos os clientes (trazendo os resgates de cada um)
    async listarClientes() {
        return await this.prisma.clienteClube.findMany({
            include: {
                resgates: true, // Isso faz um JOIN e traz o histórico de resgates junto com o cliente
            },
        });
    }

    // READ - Consultar um cliente específico pelo Código de Parceiro (codParc)
    async buscarClientePorCodParc(codParc: string) {
        return await this.prisma.clienteClube.findUnique({
            where: { codParc },
            include: { resgates: true },
        });
    }

    // DELETE - Deletar um cliente
    // IMPORTANTE: Se o cliente tiver resgates, isso pode dar erro de chave estrangeira 
    // a menos que você adicione `onDelete: Cascade` na relação do schema.prisma
    async deletarCliente(codParc: string) {
        return await this.prisma.clienteClube.delete({
            where: { codParc },
        });
    }

    //#endregion


    //#region Resgates

    // CREATE - Criar um novo resgate para um cliente existente
    async criarResgate(dadosResgate: {
        nunota: string;
        pontos: number;
        codParc: string; // Precisamos saber de qual cliente é o resgate
    }) {
        return await this.prisma.resgateClube.create({
            data: {
                nunota: dadosResgate.nunota,
                pontos: dadosResgate.pontos,
                // Usamos a chave estrangeira codParc para conectar este resgate ao cliente
                cliente: {
                    connect: {
                        codParc: dadosResgate.codParc,
                    },
                },
            },
        });
    }

    // READ - Consultar todos os resgates (trazendo os dados do cliente dono do resgate)
    async listarResgates() {
        return await this.prisma.resgateClube.findMany({
            include: {
                cliente: true, // Traz os dados do cliente (nome, cpf, etc) atrelado a este resgate
            },
        });
    }

    // READ - Consultar um resgate específico pelo nunota
    async buscarResgatePorNota(nunota: string) {
        return await this.prisma.resgateClube.findUnique({
            where: { nunota },
            include: { cliente: true },
        });
    }

    // DELETE - Deletar um resgate específico pelo seu ID ou nunota
    async deletarResgate(nunota: string) {
        return await this.prisma.resgateClube.delete({
            where: { nunota }, // Deletando com base no nunota, já que ele é @unique
        });
    }

    //#endregion


    async login(identificacao: string, senhaPlana: string) {
        // 1. Procura o cliente na base de dados por CPF OU E-mail
        // ATENÇÃO: Substitua 'clienteClube' pelo nome correto da sua tabela no schema.prisma!
        const cliente = await this.prisma.clienteClube.findFirst({
            where: {
                OR: [
                    { cpf: identificacao },
                    { email: identificacao },
                ],
            },
        });

        if (!cliente) {
            throw new UnauthorizedException('Credenciais inválidas.');
        }

        // 2. Verifica se a senha está correta
        //const senhaValida = await bcrypt.compare(senhaPlana, cliente.senha);
        const senhaValida = true;
        if (!senhaValida) {
            throw new UnauthorizedException('Credenciais inválidas.');
        }

        // 3. Gera o Token JWT para a sessão
        const payload = {
            sub: cliente.id,
            cpf: cliente.cpf,
            role: 'clube_member' // Identifica que é um cliente e não um admin
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: cliente.id,
                nome: cliente.nome,
                email: cliente.email,
                cpf: cliente.cpf,
            }
        };
    }


    //@Cron('0 */1 * * * *')
    async registerClub() {
        this.logger.log('Verificação de notas para o clube iniciada.');
        const token = await this.sankhyaService.login();

        try {
            // Busca as notas que já passaram de 24h
            const notes = await this.sankhyaService.getNota(token);
            const notesDevol = await this.sankhyaService.getNotaDevol(token);

            // Aplica regra excepcional de parceiros (Alpargatas)
            this.aplicarRegrasParceiros(notes);
            this.aplicarRegrasParceiros(notesDevol);

            // Separa notas que pontuam das que não pontuam (Técnico === 5)
            const { notasNaoPontuam, notasPontuam } = this.separarNotas(notes);
            const { notasNaoPontuam: devolNaoPontuam, notasPontuam: devolPontuam } = this.separarNotas(notesDevol);

            // 1. Processa as notas que não pontuam apenas para dar baixa no Sankhya e logar
            await this.marcarNotasNaoPontuadas(notasNaoPontuam, token, 'Nota não pontuada');
            await this.marcarNotasNaoPontuadas(devolNaoPontuam, token, 'Nota devolução não pontuada');

            // 2. Processa Devoluções (Subtrai pontos)
            for (const note of devolPontuam) {
                await this.processarPontuacaoNota(note, token, 'DEVOLUCAO');
            }

            // 3. Processa Compras (Adiciona pontos)
            for (const note of notasPontuam) {
                await this.processarPontuacaoNota(note, token, 'COMPRA');
            }

        } catch (error) {
            this.logger.error('Erro ao registrar pontuações do clube: ', error);
        } finally {
            await this.sankhyaService.logout(token, "registerClub");
        }
    }

    private aplicarRegrasParceiros(notas: any[]) {
        notas.forEach(note => {
            if (note.CODPARC === 70 || note.CODPARC === 98) {
                note.CODVENDTEC = 577;
            }
        });
    }

    private separarNotas(notas: any[]) {
        const notasNaoPontuam: any[] = [];
        const notasPontuam: any[] = [];
        notas.forEach(note => {
            if (note.VENDEDOR_AD_TIPOTECNICO !== 5) {
                notasNaoPontuam.push(note);
            } else {
                notasPontuam.push(note);
            }
        });
        return { notasNaoPontuam, notasPontuam };
    }

    private async marcarNotasNaoPontuadas(notas: any[], token: string, motivoLog: string) {
        for (const note of notas) {
            await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token);
            await this.prisma.createLogSync(motivoLog, "FINALIZADO", `Numero da nota: ${note.NUNOTA}`, "SYSTEM");
        }
    }

    private async processarPontuacaoNota(note: any, token: string, tipo: 'COMPRA' | 'DEVOLUCAO') {
        const grossTotal = (note.VLR_G1 || 0) + (note.VLR_G2 || 0);
        const ratio = grossTotal > 0 ? note.VLRNOTA / grossTotal : 1;

        // Se for devolução, o multiplicador final de pontos será negativo
        const multiplicadorSinal = tipo === 'COMPRA' ? 1 : -1;

        let pontuouAlguem = false;

        // 1. Regra do Cliente Comprador
        if (note.CODPARC) {
            const codParcCliente = String(note.CODPARC);
            const cliente = await this.prisma.clienteClube.findUnique({ where: { codParc: codParcCliente } });

            if (cliente) {
                // NOVA REGRA CLIENTE: 1 em G1, 0.5 em G2
                let pontosBase = ((note.VLR_G1 || 0) * ratio * 1) + ((note.VLR_G2 || 0) * ratio * 0.5);
                let pontosFinais = Math.round(pontosBase) * multiplicadorSinal;

                if (pontosFinais !== 0) {
                    await this.atualizarPontosCliente(cliente.codParc, String(note.NUNOTA), pontosFinais, tipo);
                    pontuouAlguem = true;
                }
            }
        }

        // 2. Regra do Vendedor Técnico
        if (note.CODVENDTEC && note.CODVENDTEC !== 0) {
            const codeParcVendTec = await this.sankhyaService.getVendedor(note.CODVENDTEC, token);
            if (codeParcVendTec && codeParcVendTec.CODPARC) {
                const codParcVendedor = String(codeParcVendTec.CODPARC);
                const vendedor = await this.prisma.clienteClube.findUnique({ where: { codParc: codParcVendedor } });

                if (vendedor) {
                    // NOVA REGRA VENDEDOR TÉCNICO: 577 pontua 2 em G1. Demais pontuam 1 em G1. Todos 0.5 em G2.
                    const multiplicadorG1 = (note.CODVENDTEC === 577) ? 2 : 1;
                    let pontosBase = ((note.VLR_G1 || 0) * ratio * multiplicadorG1) + ((note.VLR_G2 || 0) * ratio * 0.5);
                    let pontosFinais = Math.round(pontosBase) * multiplicadorSinal;

                    if (pontosFinais !== 0) {
                        // Concatenamos "-VEND" para evitar quebrar o @unique de nunota na tabela NotasPontuadas 
                        // caso o cliente e o vendedor sejam do clube e pontuem pela mesma NUNOTA
                        await this.atualizarPontosCliente(vendedor.codParc, `${note.NUNOTA}-VEND`, pontosFinais, tipo);
                        pontuouAlguem = true;
                    }
                }
            }
        }

        // Atualiza nota como lida no Sankhya (já processada)
        await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token);

        if (pontuouAlguem) {
            const acao = tipo === 'COMPRA' ? 'Pontuado' : 'Estornado';
            await this.prisma.createLogSync(`Clube Eletro: Cliente ${acao}`, "FINALIZADO", `Numero da nota: ${note.NUNOTA}`, "SYSTEM");
        }
    }

    private async atualizarPontosCliente(codParc: string, nunota: string, pontosCalculados: number, tipo: 'COMPRA' | 'DEVOLUCAO') {
        // 1. Atualiza o saldo do cliente incrementando o valor (se devolução, pontosCalculados vem negativo)
        await this.prisma.clienteClube.update({
            where: { codParc },
            data: {
                pontos: { increment: pontosCalculados }
            }
        });

        // 2. Registra histórico da nota processada
        await this.prisma.notasPontuadas.create({
            data: {
                codParc,
                nunota,
                pontos: pontosCalculados,
                tipo: tipo
            }
        });
    }






}