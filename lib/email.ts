import { Resend } from 'resend'

// Lazily initialize Resend client — constructing it at module scope
// crashes `next build` (page data collection) when RESEND_API_KEY is unset
let resendClient: Resend | null = null
function getResend(): Resend {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY)
    }
    return resendClient
}

// From email - use your verified domain or Resend dev email
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'PulsePing <onboarding@resend.dev>'

interface MonitorFailureEmailParams {
    to: string
    monitorName: string
    url: string
    statusCode?: number
    message: string
    responseTime?: number
}

/**
 * Sends an email notification when a monitor health check fails
 */
export async function sendMonitorFailureEmail({
    to,
    monitorName,
    url,
    statusCode,
    message,
    responseTime
}: MonitorFailureEmailParams): Promise<boolean> {
    try {
        console.log(`📧 Sending failure notification to ${to} for "${monitorName}"`)

        const { data, error } = await getResend().emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: `🚨 Monitor Alert: ${monitorName} is DOWN`,
            html: `
                <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Monitor Alert</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
                            <strong>${monitorName}</strong> is not responding as expected
                        </p>
                    </div>

                    <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Failure Details</h2>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">Monitor</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${monitorName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">URL</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
                                    <a href="${url}" style="color: #2563eb; text-decoration: none;">${url}</a>
                                </td>
                            </tr>
                            ${statusCode ? `
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Status Code</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                    <span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 9999px; font-weight: 500;">${statusCode}</span>
                                </td>
                            </tr>
                            ` : ''}
                            ${responseTime ? `
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Response Time</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${responseTime}ms</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 12px 0; color: #6b7280;">Error</td>
                                <td style="padding: 12px 0; color: #dc2626;">${message}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; padding: 16px 0;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                            Sent by <strong>PulsePing</strong> • ${new Date().toISOString()}
                        </p>
                    </div>
                </div>
            `
        })

        if (error) {
            console.error('❌ Failed to send email:', error.message)
            return false
        }

        console.log(`✅ Email sent: ${data?.id}`)
        return true

    } catch (error) {
        console.error('❌ Failed to send email:', error instanceof Error ? error.message : 'Unknown error')
        return false
    }
}

// =====================================
// Status page incident notifications
// =====================================

const INCIDENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    INVESTIGATING: { label: 'Investigating', color: '#f59e0b' },
    IDENTIFIED: { label: 'Identified', color: '#f97316' },
    MONITORING: { label: 'Monitoring', color: '#3b82f6' },
    RESOLVED: { label: 'Resolved', color: '#10b981' },
}

function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export interface IncidentEmailRecipient {
    email: string
    token: string // per-subscriber unsubscribe token
}

interface IncidentUpdateEmailParams {
    recipients: IncidentEmailRecipient[]
    pageName: string
    slug: string
    incidentTitle: string
    incidentStatus: string
    message: string
    kind: 'created' | 'updated'
}

const RESEND_BATCH_LIMIT = 100

/**
 * Emails every status-page subscriber about an incident event.
 * Sends via Resend batch API in chunks of 100, one email per recipient
 * so each footer carries that subscriber's own unsubscribe link.
 * Returns the number of emails accepted by Resend; never throws.
 */
export async function sendIncidentUpdateEmail({
    recipients,
    pageName,
    slug,
    incidentTitle,
    incidentStatus,
    message,
    kind,
}: IncidentUpdateEmailParams): Promise<number> {
    if (recipients.length === 0) return 0

    const appUrl = getAppUrl()
    const statusUrl = `${appUrl}/status/${slug}`
    const statusMeta = INCIDENT_STATUS_LABELS[incidentStatus]
        ?? { label: incidentStatus, color: '#71717a' }

    const subject = kind === 'created'
        ? `[${pageName}] New incident: ${incidentTitle}`
        : `[${pageName}] ${statusMeta.label}: ${incidentTitle}`

    const buildHtml = (unsubscribeUrl: string) => `
        <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #18181b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: rgba(255,255,255,0.7); margin: 0 0 4px 0; font-size: 13px;">${pageName} status update</p>
                <h1 style="color: white; margin: 0; font-size: 20px;">${incidentTitle}</h1>
                <p style="margin: 12px 0 0 0;">
                    <span style="background: ${statusMeta.color}; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600;">
                        ${statusMeta.label}
                    </span>
                </p>
            </div>

            <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #111827; margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
                <a href="${statusUrl}" style="background: #18181b; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
                    View status page
                </a>
            </div>

            <div style="text-align: center; padding: 16px 0; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    You're receiving this because you subscribed to updates for ${pageName}.<br/>
                    <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
                </p>
            </div>
        </div>
    `

    let sent = 0
    for (let i = 0; i < recipients.length; i += RESEND_BATCH_LIMIT) {
        const chunk = recipients.slice(i, i + RESEND_BATCH_LIMIT)
        try {
            const { data, error } = await getResend().batch.send(
                chunk.map(recipient => {
                    const unsubscribeUrl =
                        `${appUrl}/api/status/${slug}/unsubscribe?token=${recipient.token}`
                    return {
                        from: FROM_EMAIL,
                        to: [recipient.email],
                        subject,
                        html: buildHtml(unsubscribeUrl),
                    }
                })
            )
            if (error) {
                console.error('❌ Failed to send incident email batch:', error.message)
            } else {
                sent += data?.data?.length ?? chunk.length
            }
        } catch (error) {
            console.error(
                '❌ Failed to send incident email batch:',
                error instanceof Error ? error.message : 'Unknown error'
            )
        }
    }

    console.log(`📧 Incident emails sent: ${sent}/${recipients.length} ("${incidentTitle}")`)
    return sent
}
