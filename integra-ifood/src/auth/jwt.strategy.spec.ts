import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  it('should be defined when JWT_SECRET is present', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') {
                return 'test-secret';
              }
              throw new Error(`Configuration key "${key}" does not exist`);
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    expect(strategy).toBeDefined();
  });

  it('should validate payload correctly', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    const payload = {
      sub: 'user123',
      email: 'test@example.com',
      role: 'admin',
    };
    const result = strategy.validate(payload);
    expect(result).toEqual({
      userId: 'user123',
      email: 'test@example.com',
      role: 'admin',
    });
  });

  it('should throw if JWT_SECRET is missing', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: jest.fn(() => {
                throw new Error(
                  'Configuration key "JWT_SECRET" does not exist',
                );
              }),
            },
          },
        ],
      }).compile(),
    ).rejects.toThrow('Configuration key "JWT_SECRET" does not exist');
  });
});
