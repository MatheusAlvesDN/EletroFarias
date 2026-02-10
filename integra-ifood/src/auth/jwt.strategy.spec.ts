import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = process.env;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('should be defined', () => {
    process.env.JWT_SECRET = 'test-secret';
    strategy = new JwtStrategy();
    expect(strategy).toBeDefined();
  });

  it('should throw an error if JWT_SECRET is not defined', () => {
    delete process.env.JWT_SECRET;

    // Currently, this will NOT throw because of the fallback 'dev-secret'
    // We expect this to fail initially if we assert that it throws.
    // Or we can assert that it DOES throw, knowing it will fail, to demonstrate the vulnerability.

    expect(() => {
      new JwtStrategy();
    }).toThrow('JWT_SECRET is not defined');
  });
});
