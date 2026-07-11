import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"
import { getOwnedStatusPage, incidentInclude } from "@/lib/status-page"
import { Severity } from "@/lib/generated/prisma/client"

async function loadOwnedIncident(statusPageId: string, incidentId: string, userId: string) {
    const page = await getOwnedStatusPage(statusPageId, userId)
    if (!page) return null
    const incident = await prisma.incident.findFirst({
        where: { id: incidentId, statusPageId },
        include: incidentInclude
    })
    if (!incident) return null
    return { page, incident }
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; incidentId: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, incidentId } = await params
        const owned = await loadOwnedIncident(id, incidentId, userId)
        if (!owned) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 })
        }

        return NextResponse.json({ incident: owned.incident })

    } catch (error) {
        console.error("Error fetching incident:", error)
        return NextResponse.json(
            { error: "Failed to fetch incident" },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; incidentId: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, incidentId } = await params
        const owned = await loadOwnedIncident(id, incidentId, userId)
        if (!owned) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 })
        }

        const body = await request.json()
        const data: { title?: string; severity?: Severity | null } = {}

        if (body.title !== undefined) {
            if (!body.title?.trim()) {
                return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
            }
            data.title = body.title.trim()
        }

        if (body.severity !== undefined) {
            if (body.severity !== null && !Object.values(Severity).includes(body.severity)) {
                return NextResponse.json({ error: "Invalid severity" }, { status: 400 })
            }
            data.severity = body.severity
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
        }

        const incident = await prisma.incident.update({
            where: { id: incidentId },
            data,
            include: incidentInclude
        })

        revalidatePath(`/status/${owned.page.slug}`)
        revalidatePath(`/status/${owned.page.slug}/history`)

        return NextResponse.json({
            message: "Incident updated successfully",
            incident
        })

    } catch (error) {
        console.error("Error updating incident:", error)
        return NextResponse.json(
            { error: "Failed to update incident" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; incidentId: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, incidentId } = await params
        const owned = await loadOwnedIncident(id, incidentId, userId)
        if (!owned) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 })
        }

        await prisma.incident.delete({ where: { id: incidentId } })

        revalidatePath(`/status/${owned.page.slug}`)
        revalidatePath(`/status/${owned.page.slug}/history`)

        return NextResponse.json({ message: "Incident deleted successfully" })

    } catch (error) {
        console.error("Error deleting incident:", error)
        return NextResponse.json(
            { error: "Failed to delete incident" },
            { status: 500 }
        )
    }
}
