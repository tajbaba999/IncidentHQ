import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"
import { getOwnedStatusPage } from "@/lib/status-page"
import { ComponentStatus } from "@/lib/generated/prisma/client"

const VALID_STATUSES = Object.values(ComponentStatus)

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, componentId: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, componentId } = await params
        const page = await getOwnedStatusPage(id, userId)
        if (!page) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        const existing = await prisma.statusComponent.findFirst({
            where: { id: componentId, group: { statusPageId: id } },
            select: { id: true }
        })
        if (!existing) {
            return NextResponse.json({ error: "Component not found" }, { status: 404 })
        }

        const body = await request.json()
        const data: {
            displayName?: string
            displayOrder?: number
            manualStatus?: ComponentStatus | null
            groupId?: string
        } = {}

        if ('displayName' in body) {
            if (!body.displayName) {
                return NextResponse.json({ error: "displayName cannot be empty" }, { status: 400 })
            }
            data.displayName = body.displayName
        }
        if ('displayOrder' in body) {
            if (typeof body.displayOrder !== 'number') {
                return NextResponse.json({ error: "displayOrder must be a number" }, { status: 400 })
            }
            data.displayOrder = body.displayOrder
        }
        if ('manualStatus' in body) {
            // null clears the override (back to automatic)
            if (body.manualStatus !== null && !VALID_STATUSES.includes(body.manualStatus)) {
                return NextResponse.json(
                    { error: `manualStatus must be null or one of: ${VALID_STATUSES.join(', ')}` },
                    { status: 400 }
                )
            }
            data.manualStatus = body.manualStatus
        }
        if ('groupId' in body) {
            const targetGroup = await prisma.componentGroup.findFirst({
                where: { id: body.groupId, statusPageId: id },
                select: { id: true }
            })
            if (!targetGroup) {
                return NextResponse.json({ error: "Target group not found" }, { status: 404 })
            }
            data.groupId = body.groupId
        }

        const component = await prisma.statusComponent.update({
            where: { id: componentId },
            data,
            include: {
                monitor: { select: { id: true, name: true, url: true } }
            }
        })

        revalidatePath(`/status/${page.slug}`)

        return NextResponse.json({
            message: "Component updated successfully",
            component
        })

    } catch (error) {
        console.error("Error updating component:", error)
        return NextResponse.json(
            { error: "Failed to update component" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string, componentId: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, componentId } = await params
        const page = await getOwnedStatusPage(id, userId)
        if (!page) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        const existing = await prisma.statusComponent.findFirst({
            where: { id: componentId, group: { statusPageId: id } },
            select: { id: true }
        })
        if (!existing) {
            return NextResponse.json({ error: "Component not found" }, { status: 404 })
        }

        await prisma.statusComponent.delete({ where: { id: componentId } })

        revalidatePath(`/status/${page.slug}`)

        return NextResponse.json({ message: "Component removed successfully" })

    } catch (error) {
        console.error("Error removing component:", error)
        return NextResponse.json(
            { error: "Failed to remove component" },
            { status: 500 }
        )
    }
}
