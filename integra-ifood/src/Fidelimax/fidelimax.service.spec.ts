import { Test, TestingModule } from '@nestjs/testing';
import { Fidelimax } from './fidelimax.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

describe('FidelimaxService', () => {
  let service: Fidelimax;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TOKEN_FIDELIMAX_CLIENTE') return 'mock-token-cliente';
      if (key === 'TOKEN_FIDELIMAX_PARCEIRO') return 'mock-token-parceiro';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Fidelimax,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<Fidelimax>(Fidelimax);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkClienteExiste', () => {
    it('should return true when getEnderecoDoConsumidor returns an address', async () => {
      const mockResponse = {
        data: {
          endereco: {
            logradouro: 'Rua Teste',
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.checkClienteExiste('12345678900');
      expect(result).toBe(true);
      expect(mockHttpService.post).toHaveBeenCalled();
    });

    it('should return false when getEnderecoDoConsumidor returns null/undefined address', async () => {
      const mockResponse = {
        data: {
          endereco: null,
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.checkClienteExiste('12345678900');
      expect(result).toBe(false);
    });

    it('should return false when getEnderecoDoConsumidor throws an error', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Not found')),
      );

      const result = await service.checkClienteExiste('12345678900');
      expect(result).toBe(false);
    });

    it('should return false when cpf is empty', async () => {
      const result = await service.checkClienteExiste('');
      expect(result).toBe(false);
    });
  });
});
