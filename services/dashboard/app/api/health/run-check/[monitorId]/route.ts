import { NextRequest, NextResponse } from "next/server"
import { performHealthCheck } from "@/lib/health-check"

/**
 * Manually trigger a health check for a specific monitor
 * Useful for testing and on-demand checks
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ monitorId: string }> }
) {
    try {
        const { monitorId } = await params

        if (!monitorId) {
            return NextResponse.json(
                { error: "Monitor ID is required" },
                { status: 400 }
            )
        }

        console.log(`🔍 Running health check for monitor: ${monitorId}`)

        const result = await performHealthCheck(monitorId)

        return NextResponse.json({
            message: "Health check completed",
            result
        }, { status: 200 })

    } catch (error) {
        console.error("Error running health check:", error)
        return NextResponse.json(
            {
                error: "Failed to run health check",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}
