import { FastifyRequest, FastifyReply } from 'fastify';

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId = request.headers['x-request-id'] as string || request.id;
  request.log = request.log.child({ requestId });
}

export const requestIdPlugin = {
  name: 'request-id',
  hook: 'onRequest',
  handler: requestIdMiddleware,
};

export default requestIdPlugin;