import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@pulseping/shared/logger';

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info({ correlationId: request.id }, 'GET /projects');
    return reply.send({ projects: [], message: 'Project list endpoint' });
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info({ correlationId: request.id }, 'POST /projects - create project');
    return reply.code(201).send({ id: 'new-project-id', message: 'Project created' });
  });

  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.params.id }, 'GET /projects/:id');
    return reply.send({ id: request.params.id, name: 'Sample Project' });
  });

  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.params.id }, 'PUT /projects/:id');
    return reply.send({ message: 'Project updated' });
  });

  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    logger.info({ correlationId: request.params.id }, 'DELETE /projects/:id');
    return reply.code(204).send();
  });
}