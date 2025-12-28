/**
 * Client-side error handler
 * Sanitizes errors before displaying to users
 * 
 * @security CRITICAL - Never expose technical error.message to users
 */

/**
 * Gets a user-friendly error message from any error type
 * Prevents technical error exposure (TypeError, Prisma errors, etc.)
 */
import { AppErrorCode } from './appErrorCodes';

/**
 * Gets a user-friendly error message from any error type
 * Prevents technical error exposure (TypeError, Prisma errors, etc.)
 */
export function getClientErrorMessage(error: unknown): string {
    // Error is already a string (likely from sanitized API response)
    if (typeof error === 'string') {
        return error;
    }

    // Network/fetch errors
    if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
            return 'Problème de connexion. Vérifiez votre internet et réessayez.';
        }
        return 'Une erreur technique est survenue. Veuillez réessayer.';
    }

    // API Response errors (fetch response)
    if (error && typeof error === 'object' && 'error' in error) {
        const apiError = (error as any).error;

        // Handle new structured error { message, code }
        if (typeof apiError === 'object' && apiError !== null && 'code' in apiError) {
            const code = apiError.code;
            switch (code) {
                case AppErrorCode.ALREADY_EXISTS:
                    return 'Un enregistrement avec cette valeur existe déjà.';
                case AppErrorCode.NOT_FOUND:
                    return 'La ressource demandée est introuvable.';
                case AppErrorCode.VALIDATION_FAILED:
                    return 'Données invalides. Veuillez vérifier votre saisie.';
                case AppErrorCode.UNAUTHORIZED:
                    return 'Accès non autorisé. Veuillez vous connecter.';
                case AppErrorCode.FORBIDDEN:
                    return 'Vous n\'avez pas la permission d\'effectuer cette action.';
                default:
                    return apiError.message || 'Une erreur est survenue.';
            }
        }

        // Handle legacy string error
        if (typeof apiError === 'string') {
            return apiError;
        }
    }

    // Check if error has a message property that looks server-sanitized
    if (error instanceof Error) {
        const msg = error.message;

        // Safe server messages (already sanitized)
        if (msg.includes('A record with') ||
            msg.includes('already exists') ||
            msg.includes('not found') ||
            msg.includes('Validation failed') ||
            msg.includes('Access denied')) {
            return msg; // Safe to show
        }

        // Any other Error.message should NOT be shown (technical errors)
        return 'Une erreur est survenue. Veuillez réessayer.';
    }

    // Unknown error type
    return 'Une erreur inattendue est survenue. Veuillez réessayer.';
}

/**
 * Formats error for toast notifications
 */
export function getErrorToastMessage(error: unknown, defaultMessage?: string): string {
    const msg = getClientErrorMessage(error);
    return msg || defaultMessage || 'Une erreur est survenue';
}

/**
 * Checks if an error is a network/connectivity error
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) {
        return error.message.includes('fetch') || error.message.includes('network');
    }
    return false;
}
