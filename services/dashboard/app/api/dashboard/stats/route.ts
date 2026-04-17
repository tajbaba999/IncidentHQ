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

        const now = new Date()
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        // Get all monitors for the user
        const monitors = await prisma.monitor.findMany({
            where: {
                project: { userId }
            },
            select: {
                id: true,
                name: true,
                isActive: true
            }
        })

        const totalMonitors = monitors.length

        // Get all runs in the last 24 hours for all monitors
        const allRuns = await prisma.monitorRun.findMany({
            where: {
                monitor: {
                    project: { userId }
                },
                createdAt: { gte: twentyFourHoursAgo }
            },
            orderBy: { createdAt: 'desc' },
            select: {
                success: true,
                responseTime: true,
                createdAt: true
            }
        })

        // Calculate stats
        const totalChecks = allRuns.length
        const successfulChecks = allRuns.filter(r => r.success).length
        const failedChecks = allRuns.filter(r => !r.success).length
        const overallUptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100

        // Average response time
        const validResponseTimes = allRuns.filter(r => r.responseTime && r.responseTime > 0)
        const avgResponseTime = validResponseTimes.length > 0
            ? Math.round(validResponseTimes.reduce((sum, r) => sum + (r.responseTime || 0), 0) / validResponseTimes.length)
            : 0

        // Count operational/degraded/down monitors (based on last run)
        let operationalCount = 0
        let incidentsCount = 0

        for (const monitor of monitors) {
            const lastRun = await prisma.monitorRun.findFirst({
                where: { monitorId: monitor.id },
                orderBy: { createdAt: 'desc' },
                select: { success: true }
            })
            if (lastRun?.success) {
                operationalCount++
            } else if (lastRun) {
                incidentsCount++
            }
        }

        // Hourly data for chart
        const hourlyData: { time: string; uptime: number; responseTime: number }[] = []
        for (let i = 11; i >= 0; i--) {
            const hourStart = new Date(now)
            hourStart.setMinutes(0, 0, 0)
            hourStart.setHours(hourStart.getHours() - i * 2)
            const hourEnd = new Date(hourStart)
            hourEnd.setHours(hourEnd.getHours() + 2)

            const hourRuns = allRuns.filter(r => r.createdAt >= hourStart && r.createdAt < hourEnd)
            const hourSuccess = hourRuns.filter(r => r.success).length
            const hourUptime = hourRuns.length > 0 ? (hourSuccess / hourRuns.length) * 100 : 100

            const hourValidRT = hourRuns.filter(r => r.responseTime && r.responseTime > 0)
            const hourAvgRT = hourValidRT.length > 0
                ? Math.round(hourValidRT.reduce((sum, r) => sum + (r.responseTime || 0), 0) / hourValidRT.length)
                : 0

            hourlyData.push({
                time: hourStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                uptime: Math.round(hourUptime * 100) / 100,
                responseTime: hourAvgRT
            })
        }

        return NextResponse.json({
            stats: {
                totalMonitors,
                operationalCount,
                incidentsCount,
                avgResponseTime,
                overallUptime: Math.round(overallUptime * 100) / 100
            },
            hourlyData
        })

    } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        return NextResponse.json(
            { error: "Failed to fetch dashboard stats" },
            { status: 500 }
        )
    }
}
