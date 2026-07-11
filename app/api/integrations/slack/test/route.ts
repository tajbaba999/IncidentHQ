import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { isValidSlackWebhookUrl, postToSlackWebhook } from "@/lib/notifications"

async function getDbUserId(): Promise<string | null> {
    const { userId: clerkId } = await auth()
    if (!clerkId) return null
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
    return user?.id ?? null
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Prefer the URL from the form so users can test before saving,
        // falling back to the saved integration
        let webhookUrl: unknown = (await request.json().catch(() => ({})))?.webhookUrl

        if (!webhookUrl) {
            const integration = await prisma.integration.findUnique({
                where: { userId_type: { userId, type: 'SLACK' } },
                select: { config: true },
            })
            webhookUrl = (integration?.config as { webhookUrl?: string } | null)?.webhookUrl
        }

        if (!isValidSlackWebhookUrl(webhookUrl)) {
            return NextResponse.json(
                { error: "Webhook URL must start with https://hooks.slack.com/" },
                { status: 400 }
            )
        }

        await postToSlackWebhook(webhookUrl, {
            text: "PulsePing test message",
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: "✅ *PulsePing is connected!*\nIncident and monitor alerts will be posted to this channel.",
                    },
                },
            ],
        })

        return NextResponse.json({ message: "Test message sent" })

    } catch (error) {
        console.error("Error sending Slack test message:", error)
        return NextResponse.json(
            { error: "Failed to send test message — check the webhook URL" },
            { status: 502 }
        )
    }
}
