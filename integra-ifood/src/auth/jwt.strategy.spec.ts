import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let configServiceGetMock: jest.Mock;

  beforeEach(() => {
    configServiceGetMock = jest.fn();
  });

  const createModule = async () => {
    return Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: configServiceGetMock,
          },
        },
      ],
    }).compile();
  };

  it('should be defined when JWT_SECRET is present', async () => {
    configServiceGetMock.mockReturnValue('test-secret');
    const module = await createModule();
    const strategy = module.get<JwtStrategy>(JwtStrategy);
    expect(strategy).toBeDefined();
  });

  it('should throw an error when JWT_SECRET is missing', async () => {
    configServiceGetMock.mockReturnValue(undefined);
    await expect(createModule()).rejects.toThrow('JWT_SECRET not defined');
  });
});
