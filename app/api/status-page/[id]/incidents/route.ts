import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"
import { getOwnedStatusPage, incidentInclude } from "@/lib/status-page"
import { IncidentStatus, Severity } from "@/lib/generated/prisma/client"

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const page = await getOwnedStatusPage(id, userId)
        if (!page) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        const incidents = await prisma.incident.findMany({
            where: { statusPageId: id },
            orderBy: { startedAt: 'desc' },
            include: incidentInclude
        })

        return NextResponse.json({ incidents })

    } catch (error) {
        console.error("Error fetching incidents:", error)
        return NextResponse.json(
            { error: "Failed to fetch incidents" },
            { status: 500 }
        )
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const page = await getOwnedStatusPage(id, userId)
        if (!page) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        const body = await request.json()
        const { title, severity, status, message, componentIds } = body

        if (!title?.trim() || !message?.trim()) {
            return NextResponse.json(
                { error: "Title and an initial message are required" },
                { status: 400 }
            )
        }

        const initialStatus: IncidentStatus =
            status && Object.values(IncidentStatus).includes(status)
                ? status
                : 'INVESTIGATING'

        if (severity != null && !Object.values(Severity).includes(severity)) {
            return NextResponse.json({ error: "Invalid severity" }, { status: 400 })
        }

        const affectedIds: string[] = Array.isArray(componentIds) ? componentIds : []
        if (affectedIds.length > 0) {
            const owned = await prisma.statusComponent.count({
                where: { id: { in: affectedIds }, group: { statusPageId: id } }
            })
            if (owned !== affectedIds.length) {
                return NextResponse.json(
                    { error: "One or more components do not belong to this status page" },
                    { status: 400 }
                )
            }
        }

        // Nested create keeps incident + first update + component joins atomic
        const incident = await prisma.incident.create({
            data: {
                statusPageId: id,
                title: title.trim(),
                severity: severity ?? null,
                status: initialStatus,
                resolvedAt: initialStatus === 'RESOLVED' ? new Date() : null,
                updates: {
                    create: { status: initialStatus, message: message.trim() }
                },
                components: {
                    create: affectedIds.map(componentId => ({ componentId }))
                }
            },
            include: incidentInclude
        })

        revalidatePath(`/status/${page.slug}`)
        revalidatePath(`/status/${page.slug}/history`)

        return NextResponse.json(
            {
                message: "Incident created successfully",
                incident
            },
            { status: 201 }
        )

    } catch (error) {
        console.error("Error creating incident:", error)
        return NextResponse.json(
            { error: "Failed to create incident" },
            { status: 500 }
        )
    }
}
