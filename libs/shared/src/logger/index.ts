import pino from 'pino';
import { randomUUID } from 'crypto';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  monitorId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger extends pino.Logger {
  child(context: LogContext): Logger;
  withCorrelationId(correlationId: string): Logger;
}

function createLogger(): Logger {
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' 
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
    formatters: {
      level: (label: string) => ({ level: label.toUpperCase() }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: (req: { method?: string; url?: string; headers?: { host?: string } }) => ({
        method: req.method,
        url: req.url,
        headers: { host: req.headers?.host },
      }),
      res: (res: { statusCode?: number }) => ({
        statusCode: res.statusCode,
      }),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    base: { service: 'pulseping' },
  });

  return logger as Logger;
}

export const logger = createLogger();

export function createCorrelationLogger(initialContext?: LogContext): Logger {
  const correlationId = initialContext?.correlationId || randomUUID();
  return logger.child({ correlationId, ...initialContext });
}

export function getCorrelationId(): string {
  return randomUUID();
}

export const log = {
  info: (msg: string, context?: LogContext) => logger.info(context, msg),
  error: (msg: string, err?: Error, context?: LogContext) => logger.error({ ...context, err }, msg),
  warn: (msg: string, context?: LogContext) => logger.warn(context, msg),
  debug: (msg: string, context?: LogContext) => logger.debug(context, msg),
  trace: (msg: string, context?: LogContext) => logger.trace(context, msg),
};

export default logger;