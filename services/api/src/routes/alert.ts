import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@pulseping/shared/logger';

export async function alertRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info({ correlationId: request.id }, 'GET /alerts');
    return reply.send({ alerts: [], message: 'Alert list endpoint' });
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info({ correlationId: request.id }, 'POST /alerts - create alert');
    return reply.code(201).send({ id: 'new-alert-id', message: 'Alert created' });
  });

  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.params.id }, 'GET /alerts/:id');
    return reply.send({ id: request.params.id, message: 'Sample Alert' });
  });

  fastify.put('/:id/resolve', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.params.id }, 'PUT /alerts/:id/resolve');
    return reply.send({ message: 'Alert resolved' });
  });
}