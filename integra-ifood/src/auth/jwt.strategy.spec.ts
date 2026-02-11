import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should THROW when JWT_SECRET is undefined (FIXED)', async () => {
    delete process.env.JWT_SECRET;

    await expect(
      Test.createTestingModule({
        providers: [JwtStrategy],
      }).compile(),
    ).rejects.toThrow('JWT_SECRET environment variable is not defined.');
  });

  it('should initialize when JWT_SECRET is defined', async () => {
    process.env.JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    expect(strategy).toBeDefined();
  });
});
