
// app_error_codes.ts
export enum AppErrorCode {
    // Generic
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    SERVER_ERROR = 'SERVER_ERROR',

    // Auth & Permissions
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',

    // Data Validation
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    INVALID_INPUT = 'INVALID_INPUT',

    // Resource State
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    CONFLICT = 'CONFLICT',

    // Business Logic
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    INVALID_OPERATION = 'INVALID_OPERATION'
}
