import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../Prisma/prisma.service';

type OrcamentoItemDto = {
  category: 'CABO' | 'DISJUNTOR';
  product: string;
  qty: number;
  unit: string;
};

type RowData = {
  id: number;
  left: { id: string; value: string }[];
  right: { id: string; value: string }[];
};

type CreateDfariasOrcamentoDto = {
  nome: string;
  layout: RowData[];
  quadros?: {
    id: number;
    nome: string;
    tipo?: string;
    layout: RowData[];
  }[];
  orcamentoEstruturado?: {
    totalQuadros: number;
    totalItens: number;
    totalPreenchidos: number;
    quadros: {
      id: number;
      nome: string;
      tipo?: string;
      totalItens: number;
      totalPreenchidos: number;
      itens: OrcamentoItemDto[];
      layout: RowData[];
    }[];
  };
  itens: OrcamentoItemDto[];
  totalItens: number;
  totalPreenchidos: number;
  totalQuadros?: number;
  prazoEntrega?: number | null;
};

@Injectable()
export class DfariasOrcamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async gravar(dto: CreateDfariasOrcamentoDto) {
    const nome = dto?.nome?.trim();

    if (!nome) {
      throw new BadRequestException('Nome do orçamento é obrigatório.');
    }

    const layout = Array.isArray(dto.layout) ? dto.layout : [];
    const quadros = Array.isArray(dto.quadros) ? dto.quadros : [];
    const orcamentoEstruturado = dto.orcamentoEstruturado ?? null;
    const itens = Array.isArray(dto.itens) ? dto.itens : [];
    const layoutPayload = quadros.length > 0 ? quadros : layout;

    const orcamento = await this.prisma.dfariasOrcamento.create({
      data: {
        nome,
        totalItens: Number(dto.totalItens ?? 0),
        totalPreenchidos: Number(dto.totalPreenchidos ?? 0),
        totalQuadros: Number(dto.totalQuadros ?? quadros.length ?? 1),
        prazoEntrega: dto.prazoEntrega == null ? null : Number(dto.prazoEntrega),
        layout: layoutPayload as Prisma.InputJsonValue,
        quadros: quadros.length > 0 ? (quadros as Prisma.InputJsonValue) : Prisma.DbNull,
        orcamentoEstruturado: orcamentoEstruturado
          ? (orcamentoEstruturado as Prisma.InputJsonValue)
          : Prisma.DbNull,
        itens: {
          create: itens.map((item) => ({
            categoria: item.category,
            produto: item.product,
            qtd: new Prisma.Decimal(item.qty ?? 0),
            unidade: item.unit,
          })),
        },
      },
      include: {
        itens: true,
      },
    });

    return this.mapOrcamento(orcamento);
  }

  async listar() {
    const orcamentos = await this.prisma.dfariasOrcamento.findMany({
      orderBy: { id: 'desc' },
      include: { itens: true },
    });

    return orcamentos.map((orcamento) => this.mapOrcamento(orcamento));
  }

  async buscarPorId(id: number) {
    const orcamento = await this.prisma.dfariasOrcamento.findUnique({
      where: { id },
      include: { itens: true },
    });

    if (!orcamento) {
      throw new NotFoundException('Orçamento não encontrado.');
    }

    return this.mapOrcamento(orcamento);
  }

  async excluir(id: number) {
    const existe = await this.prisma.dfariasOrcamento.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existe) {
      throw new NotFoundException('Orçamento não encontrado.');
    }

    await this.prisma.dfariasOrcamento.delete({
      where: { id },
    });

    return { message: 'Orçamento excluído com sucesso.' };
  }

  private mapOrcamento(orcamento: any) {
    return {
      id: orcamento.id,
      nome: orcamento.nome,
      totalItens: orcamento.totalItens,
      totalPreenchidos: orcamento.totalPreenchidos,
      totalQuadros: orcamento.totalQuadros,
      prazoEntrega: orcamento.prazoEntrega,
      criadoEm: orcamento.criadoEm,
      atualizadoEm: orcamento.atualizadoEm,
      layout: orcamento.layout,
      quadros: orcamento.quadros,
      orcamentoEstruturado: orcamento.orcamentoEstruturado,
      itens: (orcamento.itens ?? []).map((item: any) => ({
        id: item.id,
        category: item.categoria,
        product: item.produto,
        qty: Number(item.qtd),
        unit: item.unidade,
      })),
    };
  }
}
