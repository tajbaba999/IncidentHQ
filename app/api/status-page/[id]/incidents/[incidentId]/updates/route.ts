import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"
import { getOwnedStatusPage, incidentInclude } from "@/lib/status-page"
import { IncidentStatus } from "@/lib/generated/prisma/client"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; incidentId: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, incidentId } = await params
        const page = await getOwnedStatusPage(id, userId)
        if (!page) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        const existing = await prisma.incident.findFirst({
            where: { id: incidentId, statusPageId: id },
            select: { id: true, resolvedAt: true }
        })
        if (!existing) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 })
        }

        const body = await request.json()
        const { status, message } = body

        if (!status || !Object.values(IncidentStatus).includes(status)) {
            return NextResponse.json({ error: "A valid status is required" }, { status: 400 })
        }

        if (!message?.trim()) {
            return NextResponse.json({ error: "Update message is required" }, { status: 400 })
        }

        // Keep the original resolution time if the incident was already resolved;
        // posting a non-resolved update reopens the incident.
        const resolvedAt =
            status === 'RESOLVED' ? (existing.resolvedAt ?? new Date()) : null

        const incident = await prisma.incident.update({
            where: { id: incidentId },
            data: {
                status,
                resolvedAt,
                updates: {
                    create: { status, message: message.trim() }
                }
            },
            include: incidentInclude
        })

        revalidatePath(`/status/${page.slug}`)
        revalidatePath(`/status/${page.slug}/history`)

        return NextResponse.json(
            {
                message: "Update posted successfully",
                incident
            },
            { status: 201 }
        )

    } catch (error) {
        console.error("Error posting incident update:", error)
        return NextResponse.json(
            { error: "Failed to post update" },
            { status: 500 }
        )
    }
}
