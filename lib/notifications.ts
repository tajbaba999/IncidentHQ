import { prisma } from "@/lib/prisma"
import { sendIncidentUpdateEmail } from "@/lib/email"

const INCIDENT_STATUS_LABELS: Record<string, string> = {
    INVESTIGATING: 'Investigating',
    IDENTIFIED: 'Identified',
    MONITORING: 'Monitoring',
    RESOLVED: 'Resolved',
}

const SEVERITY_LABELS: Record<string, string> = {
    CRITICAL: 'Critical',
    MAJOR: 'Major',
    MINOR: 'Minor',
}

export interface SlackIntegrationConfig {
    webhookUrl?: string
    notifyIncidents?: boolean
    notifyMonitorDown?: boolean
}

export function isValidSlackWebhookUrl(url: unknown): url is string {
    return typeof url === 'string' && url.startsWith('https://hooks.slack.com/')
}

function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

async function getSlackConfig(userId: string): Promise<SlackIntegrationConfig | null> {
    const integration = await prisma.integration.findUnique({
        where: { userId_type: { userId, type: 'SLACK' } },
        select: { config: true },
    })
    if (!integration) return null
    const config = integration.config as SlackIntegrationConfig
    return isValidSlackWebhookUrl(config?.webhookUrl) ? config : null
}

/** Posts a Block Kit payload to a Slack incoming webhook. Throws on non-2xx. */
export async function postToSlackWebhook(webhookUrl: string, payload: object): Promise<void> {
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
        throw new Error(`Slack webhook responded ${response.status}: ${await response.text()}`)
    }
}

interface NotifyIncidentEventParams {
    statusPageId: string
    incidentId: string
    kind: 'created' | 'updated'
}

/**
 * Notifies status-page subscribers (email) and the page owner's Slack
 * about an incident being created or updated.
 *
 * Must be awaited in the calling route handler — fire-and-forget work is
 * killed when the serverless response ends. Failures are logged, never thrown.
 */
export async function notifyIncidentEvent({
    statusPageId,
    incidentId,
    kind,
}: NotifyIncidentEventParams): Promise<void> {
    try {
        const incident = await prisma.incident.findFirst({
            where: { id: incidentId, statusPageId },
            select: {
                title: true,
                severity: true,
                status: true,
                updates: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { message: true, status: true },
                },
                statusPage: {
                    select: {
                        slug: true,
                        name: true,
                        isPublished: true,
                        project: { select: { userId: true } },
                        subscribers: { select: { email: true, token: true } },
                    },
                },
            },
        })

        if (!incident) {
            console.error(`Incident ${incidentId} not found for notification`)
            return
        }

        const page = incident.statusPage
        // Draft pages aren't publicly reachable — don't email links to a 404
        if (!page.isPublished) return

        const latest = incident.updates[0]
        const message = latest?.message ?? incident.title
        const statusLabel = INCIDENT_STATUS_LABELS[incident.status] ?? incident.status

        const emailTask = sendIncidentUpdateEmail({
            recipients: page.subscribers,
            pageName: page.name,
            slug: page.slug,
            incidentTitle: incident.title,
            incidentStatus: incident.status,
            message,
            kind,
        })

        const slackTask = (async () => {
            const config = await getSlackConfig(page.project.userId)
            if (!config || config.notifyIncidents === false) return

            const statusUrl = `${getAppUrl()}/status/${page.slug}`
            const severityLine = incident.severity
                ? `\n*Severity:* ${SEVERITY_LABELS[incident.severity] ?? incident.severity}`
                : ''

            await postToSlackWebhook(config.webhookUrl!, {
                text: `${kind === 'created' ? 'New incident' : 'Incident update'}: ${incident.title} — ${statusLabel}`,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: kind === 'created' ? '🚨 New incident' : '📣 Incident update',
                            emoji: true,
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*<${statusUrl}|${incident.title}>*\n*Status:* ${statusLabel}${severityLine}`,
                        },
                    },
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: message },
                    },
                    {
                        type: 'context',
                        elements: [
                            { type: 'mrkdwn', text: `${page.name} • <${statusUrl}|View status page>` },
                        ],
                    },
                ],
            })
        })()

        const results = await Promise.allSettled([emailTask, slackTask])
        for (const result of results) {
            if (result.status === 'rejected') {
                console.error('Incident notification failed:', result.reason)
            }
        }
    } catch (error) {
        console.error('notifyIncidentEvent failed:', error)
    }
}

interface NotifyMonitorDownParams {
    userId: string
    monitorName: string
    url: string
    statusCode?: number
    responseTime?: number
    message: string
}

/**
 * Posts a monitor-down alert to the owner's Slack webhook, if configured
 * with notifyMonitorDown enabled. Failures are logged, never thrown.
 */
export async function notifyMonitorDownSlack({
    userId,
    monitorName,
    url,
    statusCode,
    responseTime,
    message,
}: NotifyMonitorDownParams): Promise<void> {
    try {
        const config = await getSlackConfig(userId)
        if (!config || config.notifyMonitorDown === false) return

        const details = [
            `*URL:* ${url}`,
            statusCode !== undefined ? `*Status code:* ${statusCode}` : null,
            responseTime !== undefined ? `*Response time:* ${responseTime}ms` : null,
            `*Error:* ${message}`,
        ].filter(Boolean).join('\n')

        await postToSlackWebhook(config.webhookUrl!, {
            text: `Monitor DOWN: ${monitorName}`,
            blocks: [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: '🔻 Monitor down', emoji: true },
                },
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: `*${monitorName}*\n${details}` },
                },
                {
                    type: 'context',
                    elements: [
                        { type: 'mrkdwn', text: `PulsePing • ${new Date().toISOString()}` },
                    ],
                },
            ],
        })
    } catch (error) {
        console.error('notifyMonitorDownSlack failed:', error)
    }
}
