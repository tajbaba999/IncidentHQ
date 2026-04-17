import { NextRequest, NextResponse } from "next/server"
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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: monitorId } = await params

        // Verify monitor exists and belongs to user
        const monitor = await prisma.monitor.findFirst({
            where: {
                id: monitorId,
                project: { userId }
            },
            select: {
                id: true,
                name: true,
                url: true,
                frequency: true,
                isActive: true,
                createdAt: true
            }
        })

        if (!monitor) {
            return NextResponse.json({ error: "Monitor not found" }, { status: 404 })
        }

        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        // Get all runs in the last 30 days
        const allRuns = await prisma.monitorRun.findMany({
            where: {
                monitorId,
                createdAt: { gte: thirtyDaysAgo }
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                success: true,
                statusCode: true,
                responseTime: true,
                message: true,
                createdAt: true
            }
        })

        // Calculate stats
        const totalChecks = allRuns.length
        const successfulChecks = allRuns.filter(r => r.success).length
        const uptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100

        // Average response time (last 24 hours)
        const recentRuns = allRuns.filter(r => r.createdAt >= twentyFourHoursAgo)
        const validResponseTimes = recentRuns.filter(r => r.responseTime && r.responseTime > 0)
        const avgResponseTime = validResponseTimes.length > 0
            ? Math.round(validResponseTimes.reduce((sum, r) => sum + (r.responseTime || 0), 0) / validResponseTimes.length)
            : 0

        // Last check info
        const lastRun = allRuns[0]
        const lastCheck = lastRun ? lastRun.createdAt : null
        const lastStatus = lastRun ? (lastRun.success ? 'operational' : 'down') : 'unknown'
        const lastStatusCode = lastRun?.statusCode || null

        // Daily uptime for the uptime bar (last 30 days)
        const dailyUptime: { date: string; status: 'up' | 'degraded' | 'down'; uptime: number }[] = []
        for (let i = 29; i >= 0; i--) {
            const dayStart = new Date(now)
            dayStart.setHours(0, 0, 0, 0)
            dayStart.setDate(dayStart.getDate() - i)
            const dayEnd = new Date(dayStart)
            dayEnd.setDate(dayEnd.getDate() + 1)

            const dayRuns = allRuns.filter(r => r.createdAt >= dayStart && r.createdAt < dayEnd)
            const daySuccess = dayRuns.filter(r => r.success).length
            const dayUptime = dayRuns.length > 0 ? (daySuccess / dayRuns.length) * 100 : 100

            let status: 'up' | 'degraded' | 'down' = 'up'
            if (dayUptime < 90) status = 'down'
            else if (dayUptime < 99) status = 'degraded'

            dailyUptime.push({
                date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                status,
                uptime: Math.round(dayUptime * 100) / 100
            })
        }

        // All response times for the graph (show all individual checks)
        const allResponseTimes = allRuns
            .filter(r => r.responseTime && r.responseTime > 0)
            .reverse() // Oldest first for chronological order
            .map((run, index) => ({
                time: run.createdAt.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }),
                responseTime: run.responseTime || 0,
                timestamp: run.createdAt.toISOString()
            }))

        // Recent logs (all available, pagination handled on frontend)
        const recentLogs = allRuns.map(run => ({
            id: run.id,
            timestamp: run.createdAt.toISOString(),
            statusCode: run.statusCode,
            responseTime: run.responseTime,
            success: run.success,
            message: run.message,
            result: run.success ? 'success' : 'failure'
        }))

        return NextResponse.json({
            monitor: {
                id: monitor.id,
                name: monitor.name,
                url: monitor.url,
                frequency: monitor.frequency,
                isActive: monitor.isActive,
                createdAt: monitor.createdAt
            },
            stats: {
                uptime: Math.round(uptime * 100) / 100,
                avgResponseTime,
                totalChecks,
                lastCheck,
                lastStatus,
                lastStatusCode
            },
            dailyUptime,
            allResponseTimes,
            recentLogs
        })

    } catch (error) {
        console.error("Error fetching monitor stats:", error)
        return NextResponse.json(
            { error: "Failed to fetch monitor stats" },
            { status: 500 }
        )
    }
}
