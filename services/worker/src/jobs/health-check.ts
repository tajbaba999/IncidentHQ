import { logger } from '@pulseping/shared/logger';

export interface HealthCheckJob {
  monitorId: string;
  url: string;
  method: string;
  expectedStatus: number;
  authType?: string;
  authData?: Record<string, unknown>;
}

export async function executeHealthCheck(job: HealthCheckJob): Promise<void> {
  logger.info({ monitorId: job.monitorId, url: job.url }, 'Executing health check');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(job.url, {
      method: job.method as any,
      headers: {
        'User-Agent': 'PulsePing/1.0',
      },
    });
    
    const responseTime = Date.now() - startTime;
    const success = response.status === job.expectedStatus;
    
    logger.info({
      monitorId: job.monitorId,
      statusCode: response.status,
      responseTime,
      success
    }, 'Health check completed');
    
  } catch (error) {
    logger.error({ 
      monitorId: job.monitorId, 
      err: error 
    }, 'Health check failed');
  }
}

export const healthCheckJob = {
  name: 'HEALTH_CHECK',
  execute: executeHealthCheck,
};

export default healthCheckJob;