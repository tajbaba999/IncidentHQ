import { NextRequest, NextResponse } from "next/server"
import { getMonitorRuns } from "@/lib/health-check"

/**
 * Get health check history for a specific monitor
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ monitorId: string }> }
) {
    try {
        const { monitorId } = await params
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')

        if (!monitorId) {
            return NextResponse.json(
                { error: "Monitor ID is required" },
                { status: 400 }
            )
        }

        const runs = await getMonitorRuns(monitorId, limit)

        return NextResponse.json({
            monitorId,
            totalRuns: runs.length,
            runs
        }, { status: 200 })

    } catch (error) {
        console.error("Error fetching monitor runs:", error)
        return NextResponse.json(
            {
                error: "Failed to fetch monitor runs",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}
