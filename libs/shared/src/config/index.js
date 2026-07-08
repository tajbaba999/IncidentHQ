"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.loadConfig = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    DATABASE_URL: zod_1.z.string().optional(),
    AWS_REGION: zod_1.z.string().default('us-east-1'),
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    SQS_QUEUE_URL: zod_1.z.string().optional(),
    CLERK_SECRET_KEY: zod_1.z.string().optional(),
    CLERK_PUBLISHABLE_KEY: zod_1.z.string().optional(),
    RESEND_API_KEY: zod_1.z.string().optional(),
    PORT: zod_1.z.string().default('3000'),
});
let cachedEnv = null;
function loadConfig() {
    if (cachedEnv)
        return cachedEnv;
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('Invalid environment variables:', result.error.format());
        throw new Error('Invalid environment configuration');
    }
    cachedEnv = result.data;
    return cachedEnv;
}
exports.loadConfig = loadConfig;
exports.config = loadConfig();
exports.default = exports.config;
