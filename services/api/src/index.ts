import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { logger, getCorrelationId } from '@pulseping/shared/logger';
import { config } from '@pulseping/shared/config';
import { healthRoute } from './routes/health.js';
import { monitorRoutes } from './routes/monitor.js';
import { projectRoutes } from './routes/project.js';
import { alertRoutes } from './routes/alert.js';
import { gracefulShutdown } from './utils/shutdown.js';

const fastify = Fastify({
  logger: false,
  genReqId: () => getCorrelationId(),
});

async function start() {
  try {
    await fastify.register(helmet, { global: true });
    
    await fastify.register(cors, { 
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    });
    
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      allowList: ['/health'],
    });

    fastify.addHook('onRequest', async (request) => {
      request.log.info({ 
        method: request.method, 
        url: request.url,
        correlationId: request.id 
      }, 'Incoming request');
    });

    fastify.addHook('onResponse', async (request, reply) => {
      request.log.info({ 
        method: request.method, 
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime 
      }, 'Request completed');
    });

    fastify.setErrorHandler(async (error, request, reply) => {
      logger.error({ 
        err: error, 
        method: request.method, 
        url: request.url,
        correlationId: request.id 
      }, 'Unhandled error');
      
      return reply.status(error.statusCode || 500).send({
        error: error.name || 'InternalServerError',
        message: error.message,
        correlationId: request.id,
      });
    });

    await fastify.register(healthRoute, { prefix: '/health' });
    await fastify.register(monitorRoutes, { prefix: '/api/monitors' });
    await fastify.register(projectRoutes, { prefix: '/api/projects' });
    await fastify.register(alertRoutes, { prefix: '/api/alerts' });

    await fastify.listen({ port: parseInt(config.PORT), host: '0.0.0.0' });
    
    logger.info({ port: config.PORT, environment: config.NODE_ENV }, 'API server started');
    
    gracefulShutdown(fastify, 'API');
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

start();