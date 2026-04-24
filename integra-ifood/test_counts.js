const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Users:', await prisma.user.count());
    console.log('Clientes:', await prisma.crmCliente.count());
    console.log('Leads:', await prisma.crmLead.count());
    console.log('Pedidos:', await prisma.crmPedido.count());
}

main().catch(console.error).finally(() => prisma.$disconnect());
