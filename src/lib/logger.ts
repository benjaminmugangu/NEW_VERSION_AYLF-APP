import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = pino({
    level: logLevel,
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
        },
    },
    base: {
        env: process.env.NODE_ENV,
    },
});

export const logError = (message: string, error: any, context?: Record<string, any>) => {
    logger.error({ err: error, ...context }, message);
};

export const logInfo = (message: string, context?: Record<string, any>) => {
    logger.info({ ...context }, message);
};

export const logWarn = (message: string, context?: Record<string, any>) => {
    logger.warn({ ...context }, message);
};
