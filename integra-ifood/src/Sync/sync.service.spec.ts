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
            login: jest.fn().mockResolvedValue('token'),
            logout: jest.fn(),
            getcurvaProdutoFromGadgetSql: jest.fn(),
          },
        },
        {
          provide: IfoodService,
          useValue: {
            getValidAccessToken: jest.fn(),
            getMerchantId: jest.fn(),
            getFirstCatalog: jest.fn(),
          },
        },
        {
          provide: Fidelimax,
          useValue: {
             listarTodosConsumidores: jest.fn(),
          },
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
    prismaService = module.get<PrismaService>(PrismaService);
    sankhyaService = module.get<SankhyaService>(SankhyaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('synccurvaProdutoProdutos', () => {
    it('should process curve updates for all products', async () => {
      const mockRows = [
        { '0': '100', '20': 'A', '1': 'Product A' },
        { '0': '101', '20': 'B', '1': 'Product B' },
        { '0': '102', '20': 'C', '1': 'Product C' },
      ];

      (sankhyaService.getcurvaProdutoFromGadgetSql as jest.Mock).mockResolvedValue(mockRows);

      const authToken = 'token';
      const result = await service.synccurvaProdutoProdutos(authToken);

      expect(sankhyaService.getcurvaProdutoFromGadgetSql).toHaveBeenCalledWith(authToken);
      expect(prismaService.updateCurva).toHaveBeenCalledTimes(3);
      expect(prismaService.updateCurva).toHaveBeenCalledWith(100, 'A', 'Product A');
      expect(prismaService.updateCurva).toHaveBeenCalledWith(101, 'B', 'Product B');
      expect(prismaService.updateCurva).toHaveBeenCalledWith(102, 'C', 'Product C');
      expect(result).toEqual({ total: 3 });
    });
  });
});
