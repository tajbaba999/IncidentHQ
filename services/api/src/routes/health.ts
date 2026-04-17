import { FastifyInstance } from 'fastify';
import { logger } from '@pulseping/shared/logger';

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    return reply.send({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'api',
      version: '1.0.0'
    });
  });

  fastify.get('/ready', async (request, reply) => {
    return reply.send({ 
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  });
}