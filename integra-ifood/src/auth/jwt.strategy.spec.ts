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

  it('should throw an error if JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    await expect(
      Test.createTestingModule({
        providers: [JwtStrategy],
      }).compile()
    ).rejects.toThrow('JWT_SECRET is not defined');
  });

  it('should be defined when JWT_SECRET is present', async () => {
    process.env.JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    expect(strategy).toBeDefined();
  });
});
