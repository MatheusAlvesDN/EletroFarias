import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  it('should throw error if JWT_SECRET is missing', () => {
    mockConfigService.get.mockReturnValue(undefined);
    expect(() => new JwtStrategy(configService)).toThrow('JWT_SECRET must be defined');
  });

  it('should succeed if JWT_SECRET is present', () => {
    mockConfigService.get.mockReturnValue('test-secret');
    const strategy = new JwtStrategy(configService);
    expect(strategy).toBeDefined();
  });
});
