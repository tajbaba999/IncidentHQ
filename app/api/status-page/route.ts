import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"
import { SLUG_REGEX } from "@/lib/status-page"

export async function GET() {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const statusPages = await prisma.statusPage.findMany({
            where: { project: { userId } },
            orderBy: { createdAt: 'desc' },
            include: {
                project: { select: { id: true, name: true } },
                _count: { select: { groups: true, incidents: true, subscribers: true } }
            }
        })

        return NextResponse.json({ statusPages })

    } catch (error) {
        console.error("Error fetching status pages:", error)
        return NextResponse.json(
            { error: "Failed to fetch status pages" },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getDbUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { projectId, slug, name } = body

        if (!projectId || !slug || !name) {
            return NextResponse.json(
                { error: "projectId, slug and name are required" },
                { status: 400 }
            )
        }

        if (!SLUG_REGEX.test(slug)) {
            return NextResponse.json(
                { error: "Slug must be 3-50 characters of lowercase letters, numbers and hyphens" },
                { status: 400 }
            )
        }

        const project = await prisma.project.findFirst({
            where: { id: projectId, userId },
            include: { statusPage: { select: { id: true } } }
        })

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        if (project.statusPage) {
            return NextResponse.json(
                { error: "This project already has a status page" },
                { status: 409 }
            )
        }

        const slugTaken = await prisma.statusPage.findUnique({
            where: { slug },
            select: { id: true }
        })

        if (slugTaken) {
            return NextResponse.json(
                { error: "This slug is already taken" },
                { status: 409 }
            )
        }

        const statusPage = await prisma.statusPage.create({
            data: { projectId, slug, name }
        })

        return NextResponse.json(
            {
                message: "Status page created successfully",
                statusPage
            },
            { status: 201 }
        )

    } catch (error) {
        console.error("Error creating status page:", error)
        return NextResponse.json(
            { error: "Failed to create status page" },
            { status: 500 }
        )
    }
}
