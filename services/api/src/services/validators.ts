import { z } from 'zod';

export const monitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  description: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  frequency: z.number().int().min(30).default(60),
  isActive: z.boolean().default(true),
  alertEmail: z.string().email().optional(),
  authType: z.enum(['NONE', 'HEADER', 'BEARER', 'BASIC']).default('NONE'),
  authData: z.record(z.unknown()).optional(),
  projectId: z.string().optional(),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const alertSchema = z.object({
  monitorId: z.string(),
  type: z.enum(['EMAIL', 'SLACK']),
  message: z.string().optional(),
});

export type MonitorInput = z.infer<typeof monitorSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type AlertInput = z.infer<typeof alertSchema>;

export const schemas = {
  monitor: monitorSchema,
  project: projectSchema,
  alert: alertSchema,
};

export default schemas;