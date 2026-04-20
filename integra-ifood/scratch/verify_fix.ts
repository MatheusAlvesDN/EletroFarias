import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCreatePedido() {
  console.log('--- Testando Criação de Pedido CRM ---');

  // 1. Verificar se existe um usuário e um cliente
  const user = await prisma.user.findFirst();
  const cliente = await prisma.crmCliente.findFirst();

  if (!user || !cliente) {
    console.error('Erro: Usuário ou Cliente não encontrado para o teste.');
    return;
  }

  console.log(`Usando User ID: ${user.id}`);
  console.log(`Usando Cliente ID: ${cliente.id}`);

  // 3. Simular dados vindo do frontend (com codProd como string)
  const testData = {
    clienteId: cliente.id,
    observacoes: 'Pedido de teste via script de validação',
    itens: [
      {
        codProd: '14523', // String que deve ser casted para Number
        descricao: 'PENDENTE FIT (Teste)',
        quantidade: 2,
        precoUnitario: 100.50
      }
    ]
  };

  try {
    // Cálculo do total (mesma lógica do service)
    const valorTotal = testData.itens.reduce(
        (acc, item) => acc + (item.quantidade * item.precoUnitario),
        0
    );

    const pedido = await prisma.crmPedido.create({
      data: {
        userId: user.id,
        clienteId: testData.clienteId,
        valorTotal,
        observacoes: testData.observacoes,
        itens: {
          create: testData.itens.map(item => ({
            codProd: Number(item.codProd), // A correção que aplicamos
            descricao: item.descricao,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            precoTotal: item.quantidade * item.precoUnitario,
          }))
        }
      },
      include: {
        itens: true
      }
    });

    console.log('Pedido criado com sucesso!');
    console.log('ID do Pedido:', pedido.id);
    console.log('Itens do Pedido:', JSON.stringify(pedido.itens, null, 2));

    // Limpeza (opcional): se quiser remover o pedido de teste
    // await prisma.crmPedidoItem.deleteMany({ where: { pedidoId: pedido.id } });
    // await prisma.crmPedido.delete({ where: { id: pedido.id } });
    // console.log('Pedido de teste removido.');

  } catch (error) {
    console.error('Erro ao criar pedido de teste:', error);
  }
}

testCreatePedido()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
