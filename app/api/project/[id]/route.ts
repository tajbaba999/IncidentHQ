import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDbUserId } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: projectId } = await params

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
        }

        // Verify project exists and belongs to user
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                userId
            },
            include: {
                monitors: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: { monitorRuns: true }
                        }
                    }
                },
                _count: {
                    select: { monitors: true }
                }
            }
        })

        if (!project) {
            return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 })
        }

        return NextResponse.json({ project }, { status: 200 })

    } catch (error) {
        console.error("Error fetching project:", error)
        return NextResponse.json(
            { error: "Failed to fetch project" },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: projectId } = await params

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
        }

        // Verify project exists and belongs to user
        const existingProject = await prisma.project.findFirst({
            where: {
                id: projectId,
                userId
            }
        })

        if (!existingProject) {
            return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 })
        }

        const body = await request.json()
        const { name, description } = body

        // Don't allow changing userId
        const updatedProject = await prisma.project.update({
            where: {
                id: projectId
            },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description })
            }
        })

        return NextResponse.json({
            message: "Project updated successfully",
            project: updatedProject
        }, { status: 200 })

    } catch (error) {
        console.error("Error updating project:", error)
        return NextResponse.json(
            { error: "Failed to update project" },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: projectId } = await params

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
        }

        // Verify project exists and belongs to user
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                userId
            }
        })

        if (!project) {
            return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 })
        }

        // Delete the project (monitors will be cascade deleted)
        await prisma.project.delete({
            where: {
                id: projectId
            }
        })

        return NextResponse.json({
            message: "Project and all associated monitors deleted successfully"
        }, { status: 200 })

    } catch (error) {
        console.error("Error deleting project:", error)
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        )
    }
}
