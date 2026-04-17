import { NextResponse } from "next/server"
import { monitorScheduler } from "@/lib/monitor-scheduler"

/**
 * Get scheduler status
 */
export async function GET() {
    try {
        const status = monitorScheduler.getStatus()

        return NextResponse.json({
            status: "Scheduler information",
            ...status
        })
    } catch (error) {
        console.error("Error getting scheduler status:", error)
        return NextResponse.json(
            { error: "Failed to get scheduler status" },
            { status: 500 }
        )
    }
}
