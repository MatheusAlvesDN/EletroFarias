import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService, ConfigModule } from '@nestjs/config';

describe('JwtStrategy', () => {
  // Unit tests for manual instantiation
  describe('Manual Instantiation', () => {
      it('should throw when JWT_SECRET is missing', () => {
        const mockConfigService = {
          get: jest.fn().mockReturnValue(undefined),
        } as unknown as ConfigService;

        expect(() => new JwtStrategy(mockConfigService)).toThrow('JWT_SECRET environment variable is not defined');
      });

      it('should not throw when JWT_SECRET is present', () => {
        const mockConfigService = {
            get: jest.fn().mockReturnValue('secure-secret'),
        } as unknown as ConfigService;

        expect(() => new JwtStrategy(mockConfigService)).not.toThrow();
      });

      it('should validate and return user payload', async () => {
          const mockConfigService = {
              get: jest.fn().mockReturnValue('secure-secret'),
          } as unknown as ConfigService;

          const strategy = new JwtStrategy(mockConfigService);
          const payload = { sub: '123', email: 'test@example.com', role: 'USER' };
          const result = await strategy.validate(payload);

          expect(result).toEqual({ userId: '123', email: 'test@example.com', role: 'USER' });
      });
  });

  // Integration test for DI
  describe('Dependency Injection', () => {
      it('should be resolved when ConfigModule provides JWT_SECRET', async () => {
        const module: TestingModule = await Test.createTestingModule({
          imports: [
              ConfigModule.forRoot({
                  isGlobal: true,
                  load: [() => ({ JWT_SECRET: 'test-secret' })],
              }),
          ],
          providers: [JwtStrategy],
        }).compile();

        const strategy = module.get<JwtStrategy>(JwtStrategy);
        expect(strategy).toBeDefined();
      });

       it('should fail validation if JWT_SECRET is missing in ConfigModule', async () => {
        // Here we provide ConfigModule but without the secret
        // The strategy constructor should throw

        await expect(Test.createTestingModule({
          imports: [
              ConfigModule.forRoot({
                  isGlobal: true,
                  load: [() => ({ })], // No JWT_SECRET
              }),
          ],
          providers: [JwtStrategy],
        }).compile()).rejects.toThrow('JWT_SECRET environment variable is not defined');
      });
  });
});
