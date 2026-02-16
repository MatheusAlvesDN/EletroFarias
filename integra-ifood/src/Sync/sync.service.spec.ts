import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { IfoodService } from '../Ifood/ifood.service';
import { Fidelimax } from '../Fidelimax/fidelimax.service';
import { TransporteMais } from '../Transporte+/transport.service';
import { PrismaService } from '../Prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let sankhyaService: SankhyaService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: SankhyaService,
          useValue: {
            getcurvaProdutoFromGadgetSql: jest.fn(),
          },
        },
        {
          provide: IfoodService,
          useValue: {},
        },
        {
          provide: Fidelimax,
          useValue: {},
        },
        {
          provide: TransporteMais,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {
            updateCurva: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    sankhyaService = module.get<SankhyaService>(SankhyaService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should process synccurvaProdutoProdutos concurrently', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      '0': i,
      '20': `A${i}`,
      '1': `Desc${i}`,
    }));

    (
      sankhyaService.getcurvaProdutoFromGadgetSql as jest.Mock
    ).mockResolvedValue(rows);
    (prismaService.updateCurva as jest.Mock).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10)); // simulate delay
      return {};
    });

    const result = await service.synccurvaProdutoProdutos('token');

    expect(result.total).toBe(50);
    expect(sankhyaService.getcurvaProdutoFromGadgetSql).toHaveBeenCalledWith(
      'token',
    );
    expect(prismaService.updateCurva).toHaveBeenCalledTimes(50);

    // Verify arguments for a few calls
    expect(prismaService.updateCurva).toHaveBeenCalledWith(0, 'A0', 'Desc0');
    expect(prismaService.updateCurva).toHaveBeenCalledWith(49, 'A49', 'Desc49');
  });
});
