import { NextRequest, NextResponse } from "next/server"
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

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/postmortem/[id]
 * Get a single postmortem by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const postmortem = await prisma.postmortem.findFirst({
            where: {
                id,
                userId
            },
            include: {
                monitor: {
                    select: {
                        id: true,
                        name: true,
                        url: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        if (!postmortem) {
            return NextResponse.json(
                { error: "Postmortem not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ postmortem })

    } catch (error) {
        console.error("Error fetching postmortem:", error)
        return NextResponse.json(
            { error: "Failed to fetch postmortem" },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/postmortem/[id]
 * Update a postmortem
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Verify ownership
        const existing = await prisma.postmortem.findFirst({
            where: { id, userId }
        })

        if (!existing) {
            return NextResponse.json(
                { error: "Postmortem not found" },
                { status: 404 }
            )
        }

        const body = await request.json()
        const {
            title,
            rootCause,
            timeline,
            severity,
            status,
            summary,
            resolution,
            writtenBy,
            incidentStart,
            incidentEnd
        } = body

        // Build update data
        const updateData: Record<string, unknown> = {}

        if (title !== undefined) updateData.title = title
        if (rootCause !== undefined) updateData.rootCause = rootCause
        if (timeline !== undefined) updateData.timeline = timeline
        if (summary !== undefined) updateData.summary = summary
        if (resolution !== undefined) updateData.resolution = resolution
        if (writtenBy !== undefined) updateData.writtenBy = writtenBy
        if (incidentStart !== undefined) updateData.incidentStart = incidentStart ? new Date(incidentStart) : null
        if (incidentEnd !== undefined) updateData.incidentEnd = incidentEnd ? new Date(incidentEnd) : null

        // Validate and set severity
        if (severity !== undefined) {
            if (!Object.values(Severity).includes(severity as Severity)) {
                return NextResponse.json(
                    { error: `Invalid severity. Must be one of: ${Object.values(Severity).join(', ')}` },
                    { status: 400 }
                )
            }
            updateData.severity = severity
        }

        // Validate and set status
        if (status !== undefined) {
            if (!Object.values(PostmortemStatus).includes(status as PostmortemStatus)) {
                return NextResponse.json(
                    { error: `Invalid status. Must be one of: ${Object.values(PostmortemStatus).join(', ')}` },
                    { status: 400 }
                )
            }
            updateData.status = status
        }

        const postmortem = await prisma.postmortem.update({
            where: { id },
            data: updateData,
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
            message: "Postmortem updated successfully",
            postmortem
        })

    } catch (error) {
        console.error("Error updating postmortem:", error)
        return NextResponse.json(
            {
                error: "Failed to update postmortem",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/postmortem/[id]
 * Delete a postmortem
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Verify ownership
        const existing = await prisma.postmortem.findFirst({
            where: { id, userId }
        })

        if (!existing) {
            return NextResponse.json(
                { error: "Postmortem not found" },
                { status: 404 }
            )
        }

        await prisma.postmortem.delete({
            where: { id }
        })

        return NextResponse.json({
            message: "Postmortem deleted successfully"
        })

    } catch (error) {
        console.error("Error deleting postmortem:", error)
        return NextResponse.json(
            { error: "Failed to delete postmortem" },
            { status: 500 }
        )
    }
}
