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
        const { name } = body

        if (!name) {
            return NextResponse.json({ error: "Group name is required" }, { status: 400 })
        }

        const lastGroup = await prisma.componentGroup.findFirst({
            where: { statusPageId: id },
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true }
        })

        const group = await prisma.componentGroup.create({
            data: {
                statusPageId: id,
                name,
                displayOrder: (lastGroup?.displayOrder ?? -1) + 1
            }
        })

        revalidatePath(`/status/${page.slug}`)

        return NextResponse.json(
            {
                message: "Group created successfully",
                group
            },
            { status: 201 }
        )

    } catch (error) {
        console.error("Error creating group:", error)
        return NextResponse.json(
            { error: "Failed to create group" },
            { status: 500 }
        )
    }
}
