import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 5 });
  console.log('Users:', JSON.stringify(users, null, 2));
  
  const pedidos = await prisma.crmPedido.findMany({ take: 5 });
  console.log('Pedidos:', JSON.stringify(pedidos, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
