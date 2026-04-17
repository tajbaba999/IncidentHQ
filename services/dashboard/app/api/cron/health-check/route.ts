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

/**
 * GET /api/cron/health-check
 * Fetch all monitor runs (optionally filtered by monitorId)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const monitorId = searchParams.get('monitorId')
        const limit = parseInt(searchParams.get('limit') || '100')

        const runs = await prisma.monitorRun.findMany({
            where: monitorId ? { monitorId } : {},
            orderBy: { createdAt: 'desc' },
            take: limit,
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

        return NextResponse.json({
            totalRuns: runs.length,
            runs
        }, { status: 200 })

    } catch (error) {
        console.error("Error fetching monitor runs:", error)
        return NextResponse.json(
            { error: "Failed to fetch monitor runs" },
            { status: 500 }
        )
    }
}
