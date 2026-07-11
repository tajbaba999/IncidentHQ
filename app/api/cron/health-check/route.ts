import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { performHealthCheck } from "@/lib/health-check"

/**
 * POST /api/cron/health-check
 * Called by the cron scheduler to trigger a health check
 * Stores the result in MonitorRun
 */
export async function POST(request: NextRequest) {
    try {
        // Safely parse JSON body
        let body: { monitorId?: string } = {}
        try {
            const text = await request.text()
            if (text) {
                body = JSON.parse(text)
            }
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 }
            )
        }

        const { monitorId } = body

        if (!monitorId) {
            return NextResponse.json(
                { error: "monitorId is required" },
                { status: 400 }
            )
        }

        // Run the health check
        const result = await performHealthCheck(monitorId)

        return NextResponse.json(result, { status: 200 })

    } catch (error) {
        console.error("Health check API error:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}

// Bounds one sweep so a large fleet can't outlive the serverless invocation;
// the next minute's sweep picks up whatever is still due.
const SWEEP_BATCH_LIMIT = 50

// A monitor due "every 60s" checked by a cron that also runs every 60s would
// otherwise always be ~a second short and skip to the next tick.
const DUE_TOLERANCE_MS = 5_000

/**
 * GET /api/cron/health-check
 * Vercel Cron sweep (SaaS mode): runs every active monitor that is due —
 * i.e. has no run newer than its frequency. Requires CRON_SECRET, which
 * Vercel sends automatically as a Bearer token for cron invocations.
 */
export async function GET(request: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret) {
            return NextResponse.json(
                { error: "CRON_SECRET is not configured" },
                { status: 503 }
            )
        }
        if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const monitors = await prisma.monitor.findMany({
            where: { isActive: true },
            select: {
                id: true,
                frequency: true,
                monitorRuns: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { createdAt: true }
                }
            }
        })

        const now = Date.now()
        const due = monitors
            .filter(monitor => {
                const lastRun = monitor.monitorRuns[0]?.createdAt
                if (!lastRun) return true
                return now - lastRun.getTime() >= monitor.frequency * 1000 - DUE_TOLERANCE_MS
            })
            .slice(0, SWEEP_BATCH_LIMIT)

        const results = await Promise.allSettled(
            due.map(monitor => performHealthCheck(monitor.id))
        )
        const failed = results.filter(result => result.status === 'rejected').length
        for (const result of results) {
            if (result.status === 'rejected') {
                console.error("Sweep health check failed:", result.reason)
            }
        }

        return NextResponse.json({
            totalActive: monitors.length,
            checked: due.length,
            failed
        }, { status: 200 })

    } catch (error) {
        console.error("Health check sweep error:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        )
    }
}
