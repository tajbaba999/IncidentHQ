import { logger } from '@pulseping/shared/logger';
import { SqsQueue, QUEUE_NAMES, getQueueUrl } from '@pulseping/shared/queue';
import { randomUUID } from 'crypto';

async function start() {
  logger.info({ service: 'worker' }, 'Starting worker service');

  const healthCheckQueue = new SqsQueue({
    queueUrl: getQueueUrl(QUEUE_NAMES.HEALTH_CHECK),
  });

  logger.info({ queueUrl: getQueueUrl(QUEUE_NAMES.HEALTH_CHECK) }, 'Connected to health check queue');

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.warn({ signal }, 'Received shutdown signal');
      await healthCheckQueue.shutdown();
      process.exit(0);
    });
  }

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception');
    process.exit(1);
  });

  logger.info({ service: 'worker' }, 'Worker service ready');
  
  setInterval(async () => {
    const messages = await healthCheckQueue.receiveMessages();
    for (const message of messages) {
      if (message.Body) {
        const body = JSON.parse(message.Body);
        logger.info({ messageId: body.id, type: body.type }, 'Processing message');
        
        if (body.type === 'HEALTH_CHECK') {
          logger.info({ monitorId: body.payload.monitorId }, 'Processing health check job');
        }
        
        await healthCheckQueue.deleteMessage(message.ReceiptHandle!);
      }
    }
  }, 5000);
}

start().catch((error) => {
  logger.error({ err: error }, 'Failed to start worker');
  process.exit(1);
});