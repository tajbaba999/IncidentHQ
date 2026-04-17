import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { Severity, PostmortemStatus } from "@/lib/generated/prisma/client"

// Helper function to get internal database userId with test mode support
async function getDbUserId(): Promise<string | null> {
    const headerPayload = await headers()
    const isTestMode = headerPayload.get('x-test-auth') === 'true' && process.env.NODE_ENV !== 'production'

    let clerkId: string | null = null

    if (isTestMode) {
        const testUserId = headerPayload.get('x-test-user-id')
        console.log('⚠️ TEST MODE: Using test user ID:', testUserId)
        return testUserId
    } else {
        const authResult = await auth()
        clerkId = authResult.userId
    }

    if (!clerkId) return null

    const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true }
    })

    return user?.id || null
}

/**
 * GET /api/postmortem
 * List all postmortems for the authenticated user
 */
export async function GET() {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const postmortems = await prisma.postmortem.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
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

        return NextResponse.json({ postmortems })

    } catch (error) {
        console.error("Error fetching postmortems:", error)
        return NextResponse.json(
            { error: "Failed to fetch postmortems" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/postmortem
 * Create a new postmortem
 */
export async function POST(request: Request) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const {
            monitorId,
            title,
            rootCause,
            timeline,
            severity = 'MINOR',
            status = 'DRAFT',
            summary,
            resolution,
            writtenBy,
            incidentStart,
            incidentEnd
        } = body

        // Validate required fields
        if (!monitorId) {
            return NextResponse.json(
                { error: "monitorId is required" },
                { status: 400 }
            )
        }

        if (!title) {
            return NextResponse.json(
                { error: "title is required" },
                { status: 400 }
            )
        }

        if (!rootCause) {
            return NextResponse.json(
                { error: "rootCause is required" },
                { status: 400 }
            )
        }

        if (!timeline || !Array.isArray(timeline)) {
            return NextResponse.json(
                { error: "timeline is required and must be an array" },
                { status: 400 }
            )
        }

        // Verify the monitor exists and belongs to a project owned by the user
        const monitor = await prisma.monitor.findFirst({
            where: {
                id: monitorId,
                project: {
                    userId
                }
            }
        })

        if (!monitor) {
            return NextResponse.json(
                { error: "Monitor not found or access denied" },
                { status: 404 }
            )
        }

        // Validate severity enum
        if (!Object.values(Severity).includes(severity as Severity)) {
            return NextResponse.json(
                { error: `Invalid severity. Must be one of: ${Object.values(Severity).join(', ')}` },
                { status: 400 }
            )
        }

        // Validate status enum
        if (!Object.values(PostmortemStatus).includes(status as PostmortemStatus)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${Object.values(PostmortemStatus).join(', ')}` },
                { status: 400 }
            )
        }

        const postmortem = await prisma.postmortem.create({
            data: {
                userId,
                monitorId,
                title,
                rootCause,
                timeline,
                severity: severity as Severity,
                status: status as PostmortemStatus,
                summary: summary || null,
                resolution: resolution || null,
                writtenBy: writtenBy || null,
                incidentStart: incidentStart ? new Date(incidentStart) : null,
                incidentEnd: incidentEnd ? new Date(incidentEnd) : null
            },
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

        return NextResponse.json(
            {
                message: "Postmortem created successfully",
                postmortem
            },
            { status: 201 }
        )

    } catch (error) {
        console.error("Error creating postmortem:", error)
        return NextResponse.json(
            {
                error: "Failed to create postmortem",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}
