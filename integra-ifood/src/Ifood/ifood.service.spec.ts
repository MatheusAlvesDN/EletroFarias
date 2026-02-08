import { Test, TestingModule } from '@nestjs/testing';
import { IfoodService } from './ifood.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import * as fs from 'fs';

jest.mock('fs');

describe('IfoodService', () => {
  let service: IfoodService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IfoodService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => `mock-${key}`),
          },
        },
      ],
    }).compile();

    service = module.get<IfoodService>(IfoodService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getValidAccessToken', () => {
    it('should request a new token if file does not exist', async () => {
      // Arrange
      const mockTokenResponse = {
        data: {
          accessToken: 'new-token',
          expiresIn: 3600,
        },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (httpService.post as jest.Mock).mockReturnValue(of(mockTokenResponse));

      // Act
      const result = await service.getValidAccessToken();

      // Assert
      expect(result).toBe('new-token');

      expect(fs.existsSync).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should request a new token if file read fails', async () => {
      // Arrange
      const mockTokenResponse = {
        data: {
          accessToken: 'new-token',
          expiresIn: 3600,
        },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('invalid json');
      });
      (httpService.post as jest.Mock).mockReturnValue(of(mockTokenResponse));

      // Act
      const result = await service.getValidAccessToken();

      // Assert
      expect(result).toBe('new-token');
    });
  });
});
