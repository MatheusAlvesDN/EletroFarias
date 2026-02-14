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
  let fidelimaxService: Fidelimax;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: SankhyaService,
          useValue: {
            login: jest.fn().mockResolvedValue('fake-token'),
            logout: jest.fn().mockResolvedValue(undefined),
            getCodParcWithCPF: jest.fn(),
            IncluirClienteSankhya: jest.fn(),
            atualizarCampoParceiroCampo: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: IfoodService,
          useValue: {},
        },
        {
          provide: Fidelimax,
          useValue: {
            getEnderecoDoConsumidor: jest.fn(),
          },
        },
        {
          provide: TransporteMais,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    sankhyaService = module.get<SankhyaService>(SankhyaService);
    fidelimaxService = module.get<Fidelimax>(Fidelimax);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerUser', () => {
    it('should call atualizarCampoParceiroCampo 3 times when user is newly created', async () => {
      const payload = {
        nome: 'Teste',
        email: 'teste@example.com',
        cpf: '12345678900',
        telefone: '11999999999',
        nascimento: '1990-01-01',
      };

      jest.spyOn(sankhyaService, 'getCodParcWithCPF').mockResolvedValue(null);
      jest
        .spyOn(fidelimaxService, 'getEnderecoDoConsumidor')
        .mockResolvedValue({
          cep: '01001000',
          numero: '123',
        } as any);

      // Mock fetch to avoid network calls
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ erro: true }), // Simulate error to skip address lookup
        } as any),
      ) as any;

      jest
        .spyOn(sankhyaService, 'IncluirClienteSankhya')
        .mockResolvedValue('12345');

      await service.registerUser(payload);

      expect(sankhyaService.atualizarCampoParceiroCampo).toHaveBeenCalledTimes(
        3,
      );
      expect(sankhyaService.atualizarCampoParceiroCampo).toHaveBeenCalledWith(
        'fake-token',
        '12345',
        'EMAILNFE',
        payload.email,
      );
      expect(sankhyaService.atualizarCampoParceiroCampo).toHaveBeenCalledWith(
        'fake-token',
        '12345',
        'AD_CONSTRUTORA',
        1,
      );
      expect(sankhyaService.atualizarCampoParceiroCampo).toHaveBeenCalledWith(
        'fake-token',
        '12345',
        'AD_CONTRIBUINTE',
        1,
      );
    });
  });
});
