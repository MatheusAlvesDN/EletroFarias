const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Truncating CRM tables...");
    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CrmComentario" CASCADE;`);
        console.log("Truncated CrmComentario");
    } catch(e) { console.log(e.message) }

    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CrmAgenda" CASCADE;`);
        console.log("Truncated CrmAgenda");
    } catch(e) { console.log(e.message) }

    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CrmPedidoItem" CASCADE;`);
        console.log("Truncated CrmPedidoItem");
    } catch(e) { console.log(e.message) }

    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CrmPedido" CASCADE;`);
        console.log("Truncated CrmPedido");
    } catch(e) { console.log(e.message) }
    
    try {
        // CrmLead might not exist if restoring from backup before today, but let's try
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CrmLead" CASCADE;`);
        console.log("Truncated CrmLead");
    } catch(e) { console.log(e.message) }

    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CrmCliente" CASCADE;`);
        console.log("Truncated CrmCliente");
    } catch(e) { console.log(e.message) }

    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CrmNotificacao" CASCADE;`);
        console.log("Truncated CrmNotificacao");
    } catch(e) { console.log(e.message) }

    console.log("Done truncating CRM tables.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
