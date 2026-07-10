import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"
import { getOwnedStatusPage } from "@/lib/status-page"

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, groupId } = await params
        const page = await getOwnedStatusPage(id, userId)
        if (!page) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        const existing = await prisma.componentGroup.findFirst({
            where: { id: groupId, statusPageId: id },
            select: { id: true }
        })
        if (!existing) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 })
        }

        const body = await request.json()
        const data: { name?: string; displayOrder?: number } = {}

        if ('name' in body) {
            if (!body.name) {
                return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 })
            }
            data.name = body.name
        }
        if ('displayOrder' in body) {
            if (typeof body.displayOrder !== 'number') {
                return NextResponse.json({ error: "displayOrder must be a number" }, { status: 400 })
            }
            data.displayOrder = body.displayOrder
        }

        const group = await prisma.componentGroup.update({
            where: { id: groupId },
            data
        })

        revalidatePath(`/status/${page.slug}`)

        return NextResponse.json({
            message: "Group updated successfully",
            group
        })

    } catch (error) {
        console.error("Error updating group:", error)
        return NextResponse.json(
            { error: "Failed to update group" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, groupId } = await params
        const page = await getOwnedStatusPage(id, userId)
        if (!page) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        const existing = await prisma.componentGroup.findFirst({
            where: { id: groupId, statusPageId: id },
            select: { id: true }
        })
        if (!existing) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 })
        }

        await prisma.componentGroup.delete({ where: { id: groupId } })

        revalidatePath(`/status/${page.slug}`)

        return NextResponse.json({ message: "Group deleted successfully" })

    } catch (error) {
        console.error("Error deleting group:", error)
        return NextResponse.json(
            { error: "Failed to delete group" },
            { status: 500 }
        )
    }
}
