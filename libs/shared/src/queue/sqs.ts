import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, Message, GetQueueUrlCommand } from '@aws-sdk/client-sqs';
import { logger, LogContext } from '../logger';

export interface QueueMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  attempts?: number;
  correlationId?: string;
}

export interface QueueOptions {
  queueUrl: string;
  region?: string;
  maxMessages?: number;
  waitTimeSeconds?: number;
  visibilityTimeout?: number;
}

export class SqsQueue {
  private client: SQSClient;
  private queueUrl: string;
  private maxMessages: number;
  private waitTimeSeconds: number;
  private visibilityTimeout: number;

  constructor(options: QueueOptions) {
    this.client = new SQSClient({
      region: options.region || process.env.AWS_REGION || 'us-east-1',
      ...(process.env.AWS_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      }),
    });
    this.queueUrl = options.queueUrl;
    this.maxMessages = options.maxMessages || 10;
    this.waitTimeSeconds = options.waitTimeSeconds || 5;
    this.visibilityTimeout = options.visibilityTimeout || 300;
  }

  async sendMessage(message: QueueMessage, context?: LogContext): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        MessageGroupId: message.type,
        MessageDeduplicationId: message.id,
      });
      await this.client.send(command);
      logger.info({ ...context, messageId: message.id, queueUrl: this.queueUrl }, 'Message sent to SQS');
    } catch (error) {
      logger.error({ ...context, err: error }, 'Failed to send message to SQS');
      throw error;
    }
  }

  async receiveMessages(): Promise<Message[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.maxMessages,
        WaitTimeSeconds: this.waitTimeSeconds,
        VisibilityTimeout: this.visibilityTimeout,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
      });
      const result = await this.client.send(command);
      return result.Messages || [];
    } catch (error) {
      logger.error({ err: error }, 'Failed to receive messages from SQS');
      throw error;
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });
      await this.client.send(command);
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete message from SQS');
      throw error;
    }
  }

  async getQueueUrl(): Promise<string> {
    try {
      const command = new GetQueueUrlCommand({ QueueName: this.queueUrl });
      const result = await this.client.send(command);
      return result.QueueUrl || this.queueUrl;
    } catch {
      return this.queueUrl;
    }
  }

  async shutdown(): Promise<void> {
    await this.client.destroy();
  }
}

export function createQueue(options: QueueOptions): SqsQueue {
  return new SqsQueue(options);
}

export const QUEUE_NAMES = {
  HEALTH_CHECK: 'pulseping-health-check',
  ALERT: 'pulseping-alert',
  EMAIL: 'pulseping-email',
  MONITOR_RUN: 'pulseping-monitor-run',
} as const;

export function getQueueUrl(queueName: string): string {
  const baseUrl = process.env.SQS_QUEUE_URL || '';
  return `${baseUrl}/${queueName}`;
}

export default SqsQueue;