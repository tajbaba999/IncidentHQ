import { FastifyInstance } from 'fastify';
import { logger } from '@pulseping/shared/logger';

export async function gracefulShutdown(fastify: FastifyInstance, serviceName: string) {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.warn({ signal, service: serviceName }, 'Received shutdown signal');
      
      try {
        await fastify.close();
        logger.info({ service: serviceName }, 'Server closed gracefully');
        process.exit(0);
      } catch (error) {
        logger.error({ err: error, service: serviceName }, 'Error during shutdown');
        process.exit(1);
      }
    });
  }
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, service: serviceName }, 'Unhandled promise rejection');
  });
  
  process.on('uncaughtException', (error) => {
    logger.error({ err: error, service: serviceName }, 'Uncaught exception');
    process.exit(1);
  });
}

export default gracefulShutdown;