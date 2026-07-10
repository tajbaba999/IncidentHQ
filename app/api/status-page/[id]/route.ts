import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"
import { getOwnedStatusPage, SLUG_REGEX } from "@/lib/status-page"

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

        const statusPage = await prisma.statusPage.findFirst({
            where: { id, project: { userId } },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        monitors: {
                            select: { id: true, name: true, url: true },
                            orderBy: { name: 'asc' }
                        }
                    }
                },
                groups: {
                    orderBy: { displayOrder: 'asc' },
                    include: {
                        components: {
                            orderBy: { displayOrder: 'asc' },
                            include: {
                                monitor: { select: { id: true, name: true, url: true } }
                            }
                        }
                    }
                }
            }
        })

        if (!statusPage) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        return NextResponse.json({ statusPage })

    } catch (error) {
        console.error("Error fetching status page:", error)
        return NextResponse.json(
            { error: "Failed to fetch status page" },
            { status: 500 }
        )
    }
}

export async function PATCH(
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
        const data: {
            name?: string
            description?: string | null
            logoUrl?: string | null
            brandColor?: string | null
            slug?: string
            isPublished?: boolean
        } = {}

        if ('name' in body) {
            if (!body.name) {
                return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
            }
            data.name = body.name
        }
        if ('description' in body) data.description = body.description || null
        if ('logoUrl' in body) data.logoUrl = body.logoUrl || null
        if ('brandColor' in body) data.brandColor = body.brandColor || null
        if ('isPublished' in body) data.isPublished = Boolean(body.isPublished)

        if ('slug' in body && body.slug !== page.slug) {
            if (!SLUG_REGEX.test(body.slug)) {
                return NextResponse.json(
                    { error: "Slug must be 3-50 characters of lowercase letters, numbers and hyphens" },
                    { status: 400 }
                )
            }
            const slugTaken = await prisma.statusPage.findUnique({
                where: { slug: body.slug },
                select: { id: true }
            })
            if (slugTaken) {
                return NextResponse.json({ error: "This slug is already taken" }, { status: 409 })
            }
            data.slug = body.slug
        }

        const statusPage = await prisma.statusPage.update({
            where: { id },
            data
        })

        revalidatePath(`/status/${page.slug}`)
        if (data.slug) revalidatePath(`/status/${data.slug}`)

        return NextResponse.json({
            message: "Status page updated successfully",
            statusPage
        })

    } catch (error) {
        console.error("Error updating status page:", error)
        return NextResponse.json(
            { error: "Failed to update status page" },
            { status: 500 }
        )
    }
}

export async function DELETE(
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

        await prisma.statusPage.delete({ where: { id } })

        revalidatePath(`/status/${page.slug}`)

        return NextResponse.json({ message: "Status page deleted successfully" })

    } catch (error) {
        console.error("Error deleting status page:", error)
        return NextResponse.json(
            { error: "Failed to delete status page" },
            { status: 500 }
        )
    }
}
