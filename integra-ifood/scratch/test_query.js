
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const leads = await prisma.crmLead.findMany({
      include: {
        cliente: true,
        vendedor: { select: { email: true } },
        pedidos: {
          include: { 
            itens: true,
            anexos: true
          },
          orderBy: { createdAt: 'desc' },
        },
        agendas: {
          where: { concluido: false },
          select: {
            id: true,
            titulo: true,
            dataAgendada: true,
            concluido: true,
          },
          orderBy: { dataAgendada: 'asc' },
        },
        anexos: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    console.log('Successfully fetched ' + leads.length + ' leads');
  } catch (e) {
    console.error('Error fetching leads:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
