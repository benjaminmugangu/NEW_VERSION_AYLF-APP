import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MESSAGES } from './messages';

/**
 * Sanitizes error objects to prevent information leakage to clients.
 * Converts technical errors (Prisma, Zod, etc.) into safe, generic messages.
 * 
 * @security Critical - Never expose error.message directly to clients
 */
import { AppErrorCode } from './appErrorCodes';

export interface AppError {
    message: string;
    code: AppErrorCode;
}

/**
 * Sanitizes error objects to prevent information leakage to clients.
 * Converts technical errors (Prisma, Zod, etc.) into safe, structured errors.
 * 
 * @security Critical - Never expose error.message directly to clients
 */
export function sanitizeError(error: unknown): AppError {
    // Prisma errors - map to safe messages and codes
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                return { message: 'A record with this value already exists', code: AppErrorCode.ALREADY_EXISTS };
            case 'P2003':
                return { message: 'Referenced resource not found', code: AppErrorCode.NOT_FOUND };
            case 'P2025':
                return { message: 'Record not found', code: AppErrorCode.NOT_FOUND };
            case 'P2014':
                return { message: 'Invalid relationship', code: AppErrorCode.INVALID_INPUT };
            default:
                return { message: MESSAGES.errors.generic || 'Database error occurred', code: AppErrorCode.SERVER_ERROR };
        }
    }

    // Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
        return { message: MESSAGES.errors.validation || 'Invalid data provided', code: AppErrorCode.VALIDATION_FAILED };
    }

    // Zod validation errors
    if (error instanceof ZodError) {
        return { message: MESSAGES.errors.validation || 'Validation failed', code: AppErrorCode.VALIDATION_FAILED };
    }

    // Generic Error instances
    if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
            return { message: MESSAGES.errors.unauthorized || 'Access denied', code: AppErrorCode.UNAUTHORIZED };
        }
        if (error.message.includes('Forbidden')) {
            return { message: MESSAGES.errors.forbidden || 'Access denied', code: AppErrorCode.FORBIDDEN };
        }
        // Propagate known safe messages if logic allows, or default
        return { message: MESSAGES.errors.generic || 'An error occurred', code: AppErrorCode.UNKNOWN_ERROR };
    }

    // Unknown error type
    return { message: MESSAGES.errors.generic || 'An error occurred', code: AppErrorCode.UNKNOWN_ERROR };
}

/**
 * Sanitizes error objects for server-side logging.
 * Removes PII (emails, tokens, passwords) while preserving debugging info.
 * 
 * @security Critical - Never log PII in production
 */
export function sanitizeErrorForLogging(error: unknown, context: string): {
    context: string;
    type: string;
    code?: string;
    // NO message, NO stack, NO PII
} {
    const sanitized: any = {
        context,
        type: error?.constructor?.name || 'Unknown',
    };

    // Add error code if available (safe)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        sanitized.code = error.code;
    }

    if (error instanceof Error && 'code' in error) {
        sanitized.code = (error as any).code;
    }

    // In development only, add limited details
    if (process.env.NODE_ENV === 'development') {
        sanitized.devMessage = error instanceof Error ? error.message : String(error);
    }

    return sanitized;
}

/**
 * Safe console.error wrapper that sanitizes PII
 */
export function logError(context: string, error: unknown): void {
    const sanitized = sanitizeErrorForLogging(error, context);
    console.error(`[ERROR:${context}]`, sanitized);
}
