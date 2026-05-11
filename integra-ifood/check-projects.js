const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.dfariasOrcamento.findMany({
    take: 5,
    orderBy: { id: 'desc' },
    select: { id: true, orcamentoEstruturado: true }
  });
  console.log(JSON.stringify(projects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
