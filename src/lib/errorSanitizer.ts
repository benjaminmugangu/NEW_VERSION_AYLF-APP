import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MESSAGES } from './messages';

/**
 * Sanitizes error objects to prevent information leakage to clients.
 * Converts technical errors (Prisma, Zod, etc.) into safe, generic messages.
 * 
 * @security Critical - Never expose error.message directly to clients
 */
export function sanitizeError(error: unknown): string {
    // Prisma errors - map to safe messages
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                return 'A record with this value already exists';
            case 'P2003':
                return 'Referenced resource not found';
            case 'P2025':
                return 'Record not found';
            case 'P2014':
                return 'Invalid relationship';
            default:
                return MESSAGES.errors.generic || 'Database error occurred';
        }
    }

    // Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
        return MESSAGES.errors.validation || 'Invalid data provided';
    }

    // Zod validation errors - don't expose field details
    if (error instanceof ZodError) {
        return MESSAGES.errors.validation || 'Validation failed';
    }

    // Generic Error instances - NEVER return error.message
    if (error instanceof Error) {
        // Check for known safe error types
        if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
            return MESSAGES.errors.unauthorized || 'Access denied';
        }
        // Default to generic message
        return MESSAGES.errors.generic || 'An error occurred';
    }

    // Unknown error type
    return MESSAGES.errors.generic || 'An error occurred';
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
