import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"

export async function GET() {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const projects = await prisma.project.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { monitors: true }
                }
            }
        })

        return NextResponse.json({ projects })

    } catch (error) {
        console.error("Error fetching projects:", error)
        return NextResponse.json(
            { error: "Failed to fetch projects" },
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
        const { name, description } = body

        if (!name) {
            return NextResponse.json(
                { error: "Project name is required" },
                { status: 400 }
            )
        }

        const project = await prisma.project.create({
            data: {
                userId,
                name,
                description: description || null,
            },
        })

        return NextResponse.json(
            {
                message: "Project created successfully",
                project
            },
            { status: 201 }
        )

    } catch (error) {
        console.error("Error creating project:", error)
        return NextResponse.json(
            {
                error: "Failed to create project",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}