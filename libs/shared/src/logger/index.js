"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.getCorrelationId = exports.createCorrelationLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const crypto_1 = require("crypto");
function createLogger() {
    const logger = (0, pino_1.default)({
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
            : undefined,
        formatters: {
            level: (label) => ({ level: label.toUpperCase() }),
        },
        serializers: {
            err: pino_1.default.stdSerializers.err,
            req: (req) => ({
                method: req.method,
                url: req.url,
                headers: { host: req.headers?.host },
            }),
            res: (res) => ({
                statusCode: res.statusCode,
            }),
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        base: { service: 'pulseping' },
    });
    return logger;
}
exports.logger = createLogger();
function createCorrelationLogger(initialContext) {
    const correlationId = initialContext?.correlationId || (0, crypto_1.randomUUID)();
    return exports.logger.child({ correlationId, ...initialContext });
}
exports.createCorrelationLogger = createCorrelationLogger;
function getCorrelationId() {
    return (0, crypto_1.randomUUID)();
}
exports.getCorrelationId = getCorrelationId;
exports.log = {
    info: (msg, context) => exports.logger.info(context, msg),
    error: (msg, err, context) => exports.logger.error({ ...context, err }, msg),
    warn: (msg, context) => exports.logger.warn(context, msg),
    debug: (msg, context) => exports.logger.debug(context, msg),
    trace: (msg, context) => exports.logger.trace(context, msg),
};
exports.default = exports.logger;
