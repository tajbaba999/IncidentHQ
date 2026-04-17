import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { headers } from "next/headers"

// Helper function to get internal database userId
async function getDbUserId(): Promise<string | null> {
    const headerPayload = await headers()
    const isTestMode = headerPayload.get('x-test-auth') === 'true' && process.env.NODE_ENV !== 'production'

    if (isTestMode) {
        return headerPayload.get('x-test-user-id')
    }

    const authResult = await auth()
    const clerkId = authResult.userId
    if (!clerkId) return null

    const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true }
    })

    return user?.id || null
}

export async function GET() {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get all failed health check runs (alerts) for user's monitors
        const failedRuns = await prisma.monitorRun.findMany({
            where: {
                monitor: {
                    project: { userId }
                },
                success: false
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                monitor: {
                    select: {
                        id: true,
                        name: true,
                        url: true
                    }
                }
            }
        })

        // Transform to alerts format
        const alerts = failedRuns.map(run => ({
            id: run.id,
            monitorId: run.monitor.id,
            monitorName: run.monitor.name,
            monitorUrl: run.monitor.url,
            type: 'down',
            message: run.message || `HTTP ${run.statusCode || 'Error'} - Health check failed`,
            statusCode: run.statusCode,
            responseTime: run.responseTime,
            createdAt: run.createdAt.toISOString(),
            status: 'resolved' // All recorded failures are "resolved" by definition of being historical
        }))

        // Calculate stats
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const activeIncidents = 0 // We don't track active incidents currently
        const resolvedToday = alerts.filter(a => new Date(a.createdAt) >= today).length
        const totalAlerts = alerts.length

        return NextResponse.json({
            alerts,
            stats: {
                activeIncidents,
                resolvedToday,
                totalAlerts
            }
        })

    } catch (error) {
        console.error("Error fetching alerts:", error)
        return NextResponse.json(
            { error: "Failed to fetch alerts" },
            { status: 500 }
        )
    }
}
