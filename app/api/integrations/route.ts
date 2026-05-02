import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

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

    // Upsert — one integration per type per user
    const integration = await prisma.integration.upsert({
      where: {
        // Prisma doesn't support unique on [userId, type] without @@unique, so we delete+create
        id: (await prisma.integration.findFirst({ where: { userId, type } }))?.id ?? "new",
      },
      update: { config },
      create: { userId, type, config },
    })

    return NextResponse.json({ integration }, { status: 201 })
  } catch (error) {
    console.error("Error saving integration:", error)
    return NextResponse.json({ error: "Failed to save integration" }, { status: 500 })
  }
}
