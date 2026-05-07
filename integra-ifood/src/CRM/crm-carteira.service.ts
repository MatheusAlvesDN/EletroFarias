import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../Prisma/prisma.service';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CrmCarteiraService {
  private readonly logger = new Logger(CrmCarteiraService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sankhya: SankhyaService,
  ) {}

  /**
   * Limpa todas as atribuições de vendedores para Clientes e Leads
   */
  async resetarCarteiras() {
    this.logger.log('Resetando todas as atribuições de carteira...');
    
    const [clientes, leads] = await Promise.all([
      this.prisma.crmCliente.updateMany({
        data: { vendedorId: null }
      }),
      this.prisma.crmLead.updateMany({
        data: { vendedorId: null }
      })
    ]);

    this.logger.log(`Reset concluído: ${clientes.count} clientes e ${leads.count} leads resetados.`);
    return { clientes: clientes.count, leads: leads.count };
  }

  /**
   * Verifica leads parados há mais de 48 horas em fases críticas
   */
  async verificarSLALeads() {
    this.logger.log('Verificando SLA de leads...');
    const limiteSLA = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 horas

    const leadsAtrasados = await this.prisma.crmLead.findMany({
      where: {
        statusUpdatedAt: { lt: limiteSLA },
        status: { notIn: ['APROVADO', 'FATURADO', 'REPROVADO', 'POS_VENDA'] }
      },
      include: {
        vendedor: { select: { email: true } },
        cliente: { select: { nome: true } }
      }
    });

    if (leadsAtrasados.length > 0) {
      this.logger.warn(`${leadsAtrasados.length} leads com SLA atrasado detectados.`);
      // Aqui poderíamos disparar notificações via WebSocket/CrmGateway
    }

    return leadsAtrasados;
  }

  /**
   * Sincroniza a carteira de clientes com base no histórico de compras do Sankhya (últimos 60 dias)
   */
  async sincronizarCarteiras() {
    this.logger.log('Iniciando sincronização de carteira de clientes...');

    const token = await this.sankhya.login();
    try {
      // 1. Busca no Sankhya os parceiros que atendem à regra de recorrência (mesma lógica do cron)
      const sql = `
        WITH VENDAS_VALIDAS AS (
            SELECT CODPARC,
                   CODVEND
              FROM (
                    SELECT
                        CAB.CODPARC,
                        CAB.CODVEND,
                        CAB.DTNEG,
                        CAB.NUNOTA,
                        LAG(CAB.DTNEG) OVER (
                            PARTITION BY CAB.CODPARC, CAB.CODVEND
                            ORDER BY CAB.DTNEG, CAB.NUNOTA
                        ) AS DT_VENDA_ANTERIOR,
                        ROW_NUMBER() OVER (
                            PARTITION BY CAB.CODPARC
                            ORDER BY CAB.DTNEG DESC, CAB.NUNOTA DESC
                        ) AS RN
                    FROM TGFCAB CAB
                    WHERE CAB.STATUSNOTA = 'L'
                      AND CAB.CODTIPOPER IN (700, 326, 420, 445, 334, 383)
              )
             WHERE RN = 1
               AND DTNEG >= TRUNC(SYSDATE) - 30
               AND DT_VENDA_ANTERIOR IS NOT NULL
               AND DTNEG - DT_VENDA_ANTERIOR <= 30
        )
        SELECT 
            PAR.CODPARC, 
            PAR.NOMEPARC,
            PAR.EMAIL,
            PAR.TELEFONE,
            PAR.CGC_CPF,
            V.CODVEND
        FROM TGFPAR PAR
        INNER JOIN VENDAS_VALIDAS V ON V.CODPARC = PAR.CODPARC
      `;

      const comprasRecentes = await this.sankhya.runQuery(token, sql);
      this.logger.log(`[Depuração] Compras recorrentes encontradas no Sankhya: ${comprasRecentes.length}`);
      
      // 2. Processa os clientes: Garante que existam no Prisma e mapeia CODPARC -> CODVEND
      const mapaCompras = new Map<string, string>();
      
      for (const row of comprasRecentes) {
        const codParc = String(row.CODPARC);
        const codVend = String(row.CODVEND);
        mapaCompras.set(codParc, codVend);

        // Upsert no Prisma para garantir que o cliente exista com dados atualizados
        await this.prisma.crmCliente.upsert({
          where: { codParc },
          update: {
            nome: String(row.NOMEPARC || 'Sem Nome'),
            email: row.EMAIL ? String(row.EMAIL) : null,
            telefone: row.TELEFONE ? String(row.TELEFONE) : null,
            documento: row.CGC_CPF ? String(row.CGC_CPF) : null,
          },
          create: {
            codParc,
            nome: String(row.NOMEPARC || 'Sem Nome'),
            email: row.EMAIL ? String(row.EMAIL) : null,
            telefone: row.TELEFONE ? String(row.TELEFONE) : null,
            documento: row.CGC_CPF ? String(row.CGC_CPF) : null,
          }
        });
      }

      // 3. Busca todos os clientes do CRM que possuem codParc (agora atualizados)
      const clientes = await this.prisma.crmCliente.findMany({
        where: { codParc: { not: null } }
      });

      // 4. Busca todos os usuários vendedores e gerentes para o de/para
      const usuarios = await this.prisma.user.findMany({
        where: { 
          OR: [
            { role: 'VENDEDOR' },
            { role: 'GERENTE' },
            { role: 'MANAGER' }
          ] 
        }
      });

      const vendedoresMap = new Map<string, string>(); // codVend -> userId
      usuarios.forEach(u => {
        if (u.codVend) {
          vendedoresMap.set(String(u.codVend), u.id);
        }
      });

      this.logger.log(`[Depuração] Vendedores mapeados no CRM: ${vendedoresMap.size}`);

      // 5. Processa cada cliente
      let vinculados = 0;
      let paraGerente = 0;

      for (const cliente of clientes) {
        const codVendSankhya = mapaCompras.get(cliente.codParc!);
        let novoResponsavelId: string | null = null;

        if (codVendSankhya) {
          // Cliente comprou recentemente e atende à regra de recorrência
          novoResponsavelId = vendedoresMap.get(codVendSankhya) || null;
          
          if (novoResponsavelId) {
            vinculados++;
          } else {
            this.logger.debug(`[Depuração] Vendedor codVend=${codVendSankhya} não encontrado no CRM para o parceiro ${cliente.codParc}`);
          }
        }

        // Se não houver vendedor designado ou o vendedor não foi encontrado, fica livre
        if (!novoResponsavelId) {
          paraGerente++; // Mantendo a contagem como 'livres/gerentes' para o log
        }

        if (novoResponsavelId !== cliente.vendedorId) {
          await this.prisma.crmCliente.update({
            where: { id: cliente.id },
            data: { vendedorId: novoResponsavelId }
          });
        }
      }

      this.logger.log(`Sincronização concluída: ${vinculados} clientes vinculados a vendedores, ${paraGerente} ficaram livres.`);
      return { vinculados, paraGerente };

    } catch (error) {
      this.logger.error('Erro ao sincronizar carteiras:', error.message);
      throw error;
    } finally {
      await this.sankhya.logout(token, 'CRM Carteira Sync');
    }
  }

  // Roda automaticamente todo dia às 2h da manhã
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    await this.sincronizarCarteiras();
  }

  // Roda a verificação de SLA toda manhã às 8h
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleSlaCron() {
    await this.verificarSLALeads();
  }
}
