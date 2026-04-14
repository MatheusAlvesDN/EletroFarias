import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from '../Prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class EletroClubeService {

    constructor(private prisma: PrismaService, private jwtService: JwtService) { }

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





}