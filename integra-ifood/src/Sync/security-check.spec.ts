
import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { PrismaService } from '../Prisma/prisma.service';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ForbiddenException } from '@nestjs/common';

describe('SyncController Security Check', () => {
  let controller: SyncController;
  let syncService: SyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncService,
          useValue: {
            changeRole: jest.fn(),
            criarUsuario: jest.fn(),
          }
        },
        { provide: PrismaService, useValue: {} },
        { provide: SankhyaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SyncController>(SyncController);
    syncService = module.get<SyncService>(SyncService);
  });

  describe('changeRole', () => {
    it('should be protected with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.changeRole);
      const hasJwtGuard = guards && guards.some((guard) => guard === JwtAuthGuard);

      if (!hasJwtGuard) {
        throw new Error('Security check failed: changeRole must be protected');
      }
    });

    it('should throw ForbiddenException if user is not ADMIN', async () => {
      const req = { user: { role: 'USER' } };
      const body = { userEmail: 'test@example.com', role: 'ADMIN' };

      await expect(controller.changeRole(body, req)).rejects.toThrow(ForbiddenException);
    });

    it('should allow if user is ADMIN', async () => {
      const req = { user: { role: 'ADMIN' } };
      const body = { userEmail: 'test@example.com', role: 'MANAGER' };

      await controller.changeRole(body, req);
      expect(syncService.changeRole).toHaveBeenCalledWith(body.userEmail, body.role);
    });
  });

  describe('criarUsuario', () => {
    it('should be protected with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.criarUsuario);
      const hasJwtGuard = guards && guards.some((guard) => guard === JwtAuthGuard);

      if (!hasJwtGuard) {
        throw new Error('Security check failed: criarUsuario must be protected');
      }
    });

    it('should throw ForbiddenException if user is not ADMIN', async () => {
      const req = { user: { role: 'MANAGER' } }; // Even MANAGER should fail
      const body = { email: 'new@example.com', senha: '123' };

      await expect(controller.criarUsuario(body, req)).rejects.toThrow(ForbiddenException);
    });

    it('should allow if user is ADMIN', async () => {
      const req = { user: { role: 'ADMIN' } };
      const body = { email: 'new@example.com', senha: '123' };

      await controller.criarUsuario(body, req);
      expect(syncService.criarUsuario).toHaveBeenCalledWith(body.email, body.senha);
    });
  });
});
