import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  beforeEach(() => {
    // Create a mock ConfigService
    configService = {
      get: jest.fn(),
    } as unknown as ConfigService;
  });

  it('should be defined when JWT_SECRET is present', () => {
    // Mock get to return a secret
    (configService.get as jest.Mock).mockReturnValue('test-secret');
    strategy = new JwtStrategy(configService);
    expect(strategy).toBeDefined();
  });

  it('should throw error if JWT_SECRET is missing', () => {
    // Mock get to return undefined
    (configService.get as jest.Mock).mockReturnValue(undefined);
    expect(() => {
      new JwtStrategy(configService);
    }).toThrow('JWT_SECRET must be defined in environment variables');
  });

  it('should throw error if JWT_SECRET is empty string', () => {
    // Mock get to return empty string
    (configService.get as jest.Mock).mockReturnValue('');
    expect(() => {
      new JwtStrategy(configService);
    }).toThrow('JWT_SECRET must be defined in environment variables');
  });
});
