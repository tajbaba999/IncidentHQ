import { logger } from '@pulseping/shared/logger';

export interface AlertJob {
  alertId: string;
  userId: string;
  monitorId: string;
  type: 'EMAIL' | 'SLACK';
  message?: string;
}

export async function sendAlert(job: AlertJob): Promise<void> {
  logger.info({ alertId: job.alertId, type: job.type }, 'Sending alert notification');
  
  if (job.type === 'EMAIL') {
    logger.info({ alertId: job.alertId }, 'Email alert would be sent via Resend');
  } else if (job.type === 'SLACK') {
    logger.info({ alertId: job.alertId }, 'Slack alert would be sent via webhook');
  }
}

export const alertJob = {
  name: 'ALERT',
  execute: sendAlert,
};

export default alertJob;