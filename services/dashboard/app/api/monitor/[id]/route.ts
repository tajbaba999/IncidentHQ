import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";

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
    const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true }
    })

    return user?.id || null
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: monitorId } = await params;

        if (!monitorId) {
            return NextResponse.json({ error: "Monitor ID is required" }, { status: 400 })
        }

        // Verify monitor exists and belongs to user's project
        const monitor = await prisma.monitor.findFirst({
            where: {
                id: monitorId,
                project: {
                    userId
                }
            }
        })

        if (!monitor) {
            return NextResponse.json({ error: "Monitor not found or access denied" }, { status: 404 })
        }

        await prisma.monitor.delete({
            where: {
                id: monitorId
            }
        })

        return NextResponse.json({ message: "Monitor deleted successfully" }, { status: 200 })

    } catch (error) {
        console.error("Error deleting monitor:", error)
        return NextResponse.json(
            { error: "Failed to delete monitor" },
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

        const { id: monitorId } = await params;

        if (!monitorId) {
            return NextResponse.json({ error: "Monitor id is not present" }, { status: 400 });
        }

        // Verify monitor exists and belongs to user's project
        const existingMonitor = await prisma.monitor.findFirst({
            where: {
                id: monitorId,
                project: {
                    userId
                }
            }
        })

        if (!existingMonitor) {
            return NextResponse.json({ error: "Monitor not found or access denied" }, { status: 404 })
        }

        const body = await request.json();
        // Remove projectId from update if present - users shouldn't be able to move monitors between projects via PATCH
        const { projectId, ...updateData } = body;

        const updatedMonitor = await prisma.monitor.update({
            where: {
                id: monitorId
            },
            data: updateData
        })

        return NextResponse.json({
            message: "Monitor updated successfully",
            monitor: updatedMonitor
        }, { status: 200 });

    } catch (error) {
        console.error("Error updating monitor:", error)
        return NextResponse.json(
            { error: "Failed to update monitor" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getDbUserId()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: monitorId } = await params;

        if (!monitorId) {
            return NextResponse.json({ error: "Monitor id is not present" }, { status: 400 });
        }

        // Verify monitor exists and belongs to user's project
        const monitor = await prisma.monitor.findFirst({
            where: {
                id: monitorId,
                project: {
                    userId
                }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        if (!monitor) {
            return NextResponse.json({ error: "Monitor not found" }, { status: 404 })
        }

        return NextResponse.json({ monitor }, { status: 200 })
    } catch (error) {
        console.error("Error fetching monitor:", error)
        return NextResponse.json(
            { error: "Failed to fetch monitor" },
            { status: 500 }
        )
    }
}