import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@pulseping/shared/logger';
import { getQueueUrl, QUEUE_NAMES } from '@pulseping/shared/queue';

export async function monitorRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info({ correlationId: request.id }, 'GET /monitors - listing monitors');
    return reply.send({ monitors: [], message: 'Monitor list endpoint' });
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info({ correlationId: request.id, body: request.body }, 'POST /monitors - create monitor');
    return reply.code(201).send({ id: 'new-monitor-id', message: 'Monitor created' });
  });

  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.id, monitorId: request.params.id }, 'GET /monitors/:id');
    return reply.send({ id: request.params.id, name: 'Sample Monitor' });
  });

  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.params.id }, 'PUT /monitors/:id');
    return reply.send({ message: 'Monitor updated' });
  });

  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.params.id }, 'DELETE /monitors/:id');
    return reply.code(204).send();
  });

  fastify.post('/:id/run', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.params.id }, 'POST /monitors/:id/run - trigger monitor');
    const queueUrl = getQueueUrl(QUEUE_NAMES.HEALTH_CHECK);
    return reply.send({ message: 'Monitor queued for execution', queueUrl });
  });
}