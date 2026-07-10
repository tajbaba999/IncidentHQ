import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"
import { getOwnedStatusPage } from "@/lib/status-page"

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
        const { groupId, monitorId, displayName } = body

        if (!groupId || !monitorId) {
            return NextResponse.json(
                { error: "groupId and monitorId are required" },
                { status: 400 }
            )
        }

        const group = await prisma.componentGroup.findFirst({
            where: { id: groupId, statusPageId: id },
            select: { id: true }
        })
        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 })
        }

        const monitor = await prisma.monitor.findFirst({
            where: { id: monitorId, projectId: page.projectId },
            select: { id: true, name: true }
        })
        if (!monitor) {
            return NextResponse.json(
                { error: "Monitor not found in this status page's project" },
                { status: 404 }
            )
        }

        const existingComponent = await prisma.statusComponent.findUnique({
            where: { monitorId },
            select: { id: true }
        })
        if (existingComponent) {
            return NextResponse.json(
                { error: "This monitor is already used by a status page component" },
                { status: 409 }
            )
        }

        const lastComponent = await prisma.statusComponent.findFirst({
            where: { groupId },
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true }
        })

        const component = await prisma.statusComponent.create({
            data: {
                groupId,
                monitorId,
                displayName: displayName || monitor.name,
                displayOrder: (lastComponent?.displayOrder ?? -1) + 1
            },
            include: {
                monitor: { select: { id: true, name: true, url: true } }
            }
        })

        revalidatePath(`/status/${page.slug}`)

        return NextResponse.json(
            {
                message: "Component added successfully",
                component
            },
            { status: 201 }
        )

    } catch (error) {
        console.error("Error adding component:", error)
        return NextResponse.json(
            { error: "Failed to add component" },
            { status: 500 }
        )
    }
}
