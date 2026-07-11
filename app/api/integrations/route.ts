import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { isValidSlackWebhookUrl } from "@/lib/notifications"
import { IntegrationType } from "@/lib/generated/prisma/client"

async function getDbUserId(): Promise<string | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
  return user?.id ?? null
}

export async function GET() {
  try {
    const userId = await getDbUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const integrations = await prisma.integration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ integrations })
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { type, config } = body

    if (!type || !config) {
      return NextResponse.json({ error: "type and config are required" }, { status: 400 })
    }

    if (!Object.values(IntegrationType).includes(type)) {
      return NextResponse.json({ error: "Invalid integration type" }, { status: 400 })
    }

    // The webhook is fetched server-side later — only accept real Slack webhook URLs
    if (type === 'SLACK' && !isValidSlackWebhookUrl(config.webhookUrl)) {
      return NextResponse.json(
        { error: "Webhook URL must start with https://hooks.slack.com/" },
        { status: 400 }
      )
    }

    // Upsert — one integration per type per user
    const integration = await prisma.integration.upsert({
      where: { userId_type: { userId, type } },
      update: { config },
      create: { userId, type, config },
    })

    return NextResponse.json({ integration }, { status: 201 })
  } catch (error) {
    console.error("Error saving integration:", error)
    return NextResponse.json({ error: "Failed to save integration" }, { status: 500 })
  }
}
