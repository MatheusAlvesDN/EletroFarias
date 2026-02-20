import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { IfoodService } from '../Ifood/ifood.service';
import { Fidelimax } from '../Fidelimax/fidelimax.service';
import { TransporteMais } from '../Transporte+/transport.service';
import { PrismaService } from '../Prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let prismaService: PrismaService;
  let sankhyaService: SankhyaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: SankhyaService,
          useValue: {
            getcurvaProdutoFromGadgetSql: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
          },
        },
        { provide: IfoodService, useValue: {} },
        { provide: Fidelimax, useValue: {} },
        { provide: TransporteMais, useValue: {} },
        {
          provide: PrismaService,
          useValue: {
            updateCurva: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prismaService = module.get<PrismaService>(PrismaService);
    sankhyaService = module.get<SankhyaService>(SankhyaService);
  });

  it('should process curve updates correctly', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      '0': i,
      '20': 'A',
      '1': `Desc ${i}`,
    }));
    (
      sankhyaService.getcurvaProdutoFromGadgetSql as jest.Mock
    ).mockResolvedValue(rows);
    (prismaService.updateCurva as jest.Mock).mockResolvedValue(null);

    await service.synccurvaProdutoProdutos('token');

    expect(sankhyaService.getcurvaProdutoFromGadgetSql).toHaveBeenCalledWith(
      'token',
    );
    expect(prismaService.updateCurva).toHaveBeenCalledTimes(50);
    expect(prismaService.updateCurva).toHaveBeenCalledWith(0, 'A', 'Desc 0');
    expect(prismaService.updateCurva).toHaveBeenCalledWith(49, 'A', 'Desc 49');
  });
});
