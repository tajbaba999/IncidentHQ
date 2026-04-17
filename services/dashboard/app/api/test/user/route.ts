import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Development only - get user IDs for testing
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: "Not available in production" }, { status: 404 })
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true,
        },
        take: 10
    })

    return NextResponse.json({
        message: "Use the 'id' field as x-test-user-id header value",
        users
    })
}
