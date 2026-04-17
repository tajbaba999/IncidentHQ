import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

// Helper function to get internal database userId with test mode support
async function getDbUserId(): Promise<string | null> {
    const headerPayload = await headers()
    const isTestMode = headerPayload.get('x-test-auth') === 'true' && process.env.NODE_ENV !== 'production'

    let clerkId: string | null = null

    if (isTestMode) {
        // In test mode, x-test-user-id should be the database user ID directly
        const testUserId = headerPayload.get('x-test-user-id')
        console.log('⚠️ TEST MODE: Using test user ID:', testUserId)
        return testUserId
    } else {
        const authResult = await auth()
        clerkId = authResult.userId
    }

    if (!clerkId) return null

    // Look up the internal database user ID from Clerk ID
    let user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true }
    })

    // If user doesn't exist in database, create them
    if (!user) {
        const clerkUser = await currentUser()
        if (clerkUser) {
            user = await prisma.user.create({
                data: {
                    clerkId: clerkUser.id,
                    email: clerkUser.emailAddresses[0]?.emailAddress || '',
                    firstName: clerkUser.firstName || null,
                    lastName: clerkUser.lastName || null,
                    imageUrl: clerkUser.imageUrl || null,
                },
                select: { id: true }
            })
            console.log('✅ Auto-created user in database:', user.id)
        }
    }

    return user?.id || null
}

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
