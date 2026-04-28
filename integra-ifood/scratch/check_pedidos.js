const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pedidos = await prisma.crmPedido.findMany({
    take: 5,
    include: { cliente: true, lead: true }
  });
  console.log(JSON.stringify(pedidos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
