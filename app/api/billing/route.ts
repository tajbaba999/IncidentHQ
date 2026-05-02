import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        subscription: true,
        _count: { select: { projects: true } },
      },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const monitorCount = await prisma.monitor.count({
      where: { project: { userId: user.id } },
    })

    const sub = user.subscription

    return NextResponse.json({
      plan: sub?.plan ?? "FREE",
      status: sub?.status ?? "active",
      monitorsUsed: monitorCount,
      monitorsLimit: sub?.monitorsLimit ?? 3,
      intervalSeconds: sub?.intervalSeconds ?? 60,
    })
  } catch (error) {
    console.error("Error fetching billing:", error)
    return NextResponse.json({ error: "Failed to fetch billing" }, { status: 500 })
  }
}
