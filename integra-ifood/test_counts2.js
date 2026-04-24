const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Inventory:', await prisma.inventory.count());
    console.log('AcompanhamentoPedido:', await prisma.acompanhamentoPedido.count());
    console.log('MercadoLivreToken:', await prisma.mercadoLivreToken.count());
}

main().catch(console.error).finally(() => prisma.$disconnect());
