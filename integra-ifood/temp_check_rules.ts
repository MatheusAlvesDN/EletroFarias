
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const regras = await prisma.regrasAliquota.findMany();
  console.log(JSON.stringify(regras, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
