
import { JwtStrategy } from './jwt.strategy';
import { Test, TestingModule } from '@nestjs/testing';

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

  it('should throw an error if JWT_SECRET is not defined', async () => {
    delete process.env.JWT_SECRET;

    // Direct instantiation check since we are testing the constructor logic
    expect(() => new JwtStrategy()).toThrow('JWT_SECRET environment variable is not defined!');

    // Also check via dependency injection
    try {
      await Test.createTestingModule({
        providers: [JwtStrategy],
      }).compile();
    } catch (error) {
       expect(error.message).toBe('JWT_SECRET environment variable is not defined!');
    }
  });

  it('should be defined when JWT_SECRET is present', async () => {
    process.env.JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    expect(strategy).toBeDefined();
  });

  it('should validate successfully with correct secret', async () => {
    process.env.JWT_SECRET = 'test-secret';
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();
    strategy = module.get<JwtStrategy>(JwtStrategy);

    const payload = { sub: '123', email: 'test@example.com', role: 'USER' };
    const result = await strategy.validate(payload);
    expect(result).toEqual({ userId: '123', email: 'test@example.com', role: 'USER' });
  });
});
