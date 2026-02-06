import { Test, TestingModule } from '@nestjs/testing';
import { Fidelimax } from './fidelimax.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('FidelimaxService', () => {
    let service: Fidelimax;
    let httpService: HttpService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                Fidelimax,
                {
                    provide: HttpService,
                    useValue: {
                        post: jest.fn(),
                        get: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('token'),
                    },
                },
            ],
        }).compile();

        service = module.get<Fidelimax>(Fidelimax);
        httpService = module.get<HttpService>(HttpService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('pontuarNotasNaFidelimax', () => {
        it('should check existence per consumer and then pontuar existing ones', async () => {
            const checkResponse: AxiosResponse = {
                data: { endereco: {} },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: {} as any },
            };

            const pontuarResponse: AxiosResponse = {
                data: { success: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: {} as any },
            };

            jest.spyOn(httpService, 'post').mockImplementation((url, body: any) => {
                if (url.includes('RetornaDadosCliente')) {
                    // Check if called for correct CPF
                    if (body.cpf === '12345678900') return of(checkResponse);
                    return throwError(() => new Error('Not found'));
                }
                if (url.includes('PontuaConsumidor')) {
                    return of(pontuarResponse);
                }
                if (url.includes('ListarConsumidores')) {
                    return throwError(() => new Error('Should not list all consumers'));
                }
                return throwError(() => new Error('Unknown URL ' + url));
            });

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const notas = [
                {
                    NUNOTA: '100',
                    CODVENDTEC: 1,
                    DTALTER: '2023-01-01',
                    value: 100,
                    CODPARC: '1',
                    CGC_CPF: '12345678900' // Existing user
                }
            ];

            await service.pontuarNotasNaFidelimax(notas);

            // Verify it checked existence
            expect(httpService.post).toHaveBeenCalledWith(
                expect.stringContaining('RetornaDadosCliente'),
                expect.objectContaining({ cpf: '12345678900', endereco: false }),
                expect.anything()
            );

            // Verify it DID NOT list all consumers
            expect(httpService.post).not.toHaveBeenCalledWith(
                expect.stringContaining('ListarConsumidores'),
                expect.anything(),
                expect.anything()
            );

            // Verify it pontuated
            expect(httpService.post).toHaveBeenCalledWith(
                expect.stringContaining('PontuaConsumidor'),
                expect.objectContaining({ cpf: '12345678900', pontuacao_reais: 100 }),
                expect.anything()
            );

            consoleSpy.mockRestore();
        });

        it('should register new consumers before pontuating', async () => {
            const registerResponse: AxiosResponse = {
                data: { success: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: {} as any },
            };

            const pontuarResponse: AxiosResponse = {
                data: { success: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: {} as any },
            };

            jest.spyOn(httpService, 'post').mockImplementation((url, body: any) => {
                if (url.includes('RetornaDadosCliente')) {
                    // Simulates failure (user not found)
                    return throwError(() => new Error('Not Found'));
                }
                if (url.includes('CadastrarConsumidor')) {
                    return of(registerResponse);
                }
                if (url.includes('PontuaConsumidor')) {
                    return of(pontuarResponse);
                }
                if (url.includes('ListarConsumidores')) {
                     return throwError(() => new Error('Should not list all consumers'));
                }
                return throwError(() => new Error('Unknown URL ' + url));
            });

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const notas = [
                {
                    NUNOTA: '101',
                    CODVENDTEC: 1,
                    DTALTER: '2023-01-01',
                    value: 50,
                    CODPARC: '2',
                    CGC_CPF: '99999999999', // New user
                    NOMEPARC: 'New User',
                    EMAIL: 'new@example.com'
                }
            ];

            await service.pontuarNotasNaFidelimax(notas);

             // Verify it checked existence
            expect(httpService.post).toHaveBeenCalledWith(
                expect.stringContaining('RetornaDadosCliente'),
                expect.anything(),
                expect.anything()
            );

            // Verify it registered
            expect(httpService.post).toHaveBeenCalledWith(
                expect.stringContaining('CadastrarConsumidor'),
                expect.objectContaining({ cpf: '99999999999', nome: 'New User' }),
                expect.anything()
            );

            // Verify it pontuated
            expect(httpService.post).toHaveBeenCalledWith(
                expect.stringContaining('PontuaConsumidor'),
                expect.objectContaining({ cpf: '99999999999', pontuacao_reais: 50 }),
                expect.anything()
            );

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should handle registration returning "already exists" as success', async () => {
            const pontuarResponse: AxiosResponse = {
                data: { success: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: {} as any },
            };

            jest.spyOn(httpService, 'post').mockImplementation((url, body: any) => {
                if (url.includes('RetornaDadosCliente')) {
                    // Check fails
                    return throwError(() => new Error('Not Found'));
                }
                if (url.includes('CadastrarConsumidor')) {
                    // Registration fails with "exists"
                    return throwError(() => new Error('CPF already exists'));
                }
                if (url.includes('PontuaConsumidor')) {
                    return of(pontuarResponse);
                }
                return throwError(() => new Error('Unknown URL ' + url));
            });

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const notas = [
                {
                    NUNOTA: '102',
                    value: 50,
                    CGC_CPF: '88888888888',
                    DTALTER: '2023',
                    CODVENDTEC: 1,
                    CODPARC: '3'
                }
            ];

            await service.pontuarNotasNaFidelimax(notas);

            // Verify it registered (and failed)
            expect(httpService.post).toHaveBeenCalledWith(
                expect.stringContaining('CadastrarConsumidor'),
                expect.anything(),
                expect.anything()
            );

            // Verify it still pontuated because error was "already registered"
            expect(httpService.post).toHaveBeenCalledWith(
                expect.stringContaining('PontuaConsumidor'),
                expect.anything(),
                expect.anything()
            );

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
    });
});
