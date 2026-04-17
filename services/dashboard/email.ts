import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

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

        const { data, error } = await resend.emails.send({
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
