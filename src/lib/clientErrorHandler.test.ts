import { describe, it, expect } from 'vitest';
import { getClientErrorMessage } from './clientErrorHandler';
import { AppErrorCode } from './appErrorCodes';

describe('clientErrorHandler', () => {
    it('should map ALREADY_EXISTS code to user friendly message', () => {
        const error = { error: { code: AppErrorCode.ALREADY_EXISTS, message: 'Tech message' } };
        const msg = getClientErrorMessage(error);
        expect(msg).toBe('Un enregistrement avec cette valeur existe déjà.');
    });

    it('should map NOT_FOUND code', () => {
        const error = { error: { code: AppErrorCode.NOT_FOUND, message: 'Not found' } };
        const msg = getClientErrorMessage(error);
        expect(msg).toBe('La ressource demandée est introuvable.');
    });

    it('should fallback to message if code unknown', () => {
        const error = { error: { code: 'SOME_WEIRD_CODE', message: 'Specific error' } };
        const msg = getClientErrorMessage(error);
        expect(msg).toBe('Specific error');
    });

    it('should handle legacy string errors', () => {
        const error = { error: 'Legacy error' };
        const msg = getClientErrorMessage(error);
        expect(msg).toBe('Legacy error');
    });

    it('should handle simple Error object with safe message', () => {
        const error = new Error('A record with this value already exists');
        const msg = getClientErrorMessage(error);
        expect(msg).toBe('A record with this value already exists');
    });
});
