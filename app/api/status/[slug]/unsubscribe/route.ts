import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const token = request.nextUrl.searchParams.get("token")
    const statusUrl = new URL(`/status/${slug}`, request.url)

    if (!token) {
        return NextResponse.redirect(statusUrl)
    }

    try {
        // Idempotent: re-clicking an already-used link still lands on the notice
        await prisma.statusSubscriber.deleteMany({
            where: { token, statusPage: { slug } },
        })
    } catch (error) {
        console.error("Error unsubscribing from status page:", error)
        return NextResponse.json(
            { error: "Failed to unsubscribe" },
            { status: 500 }
        )
    }

    statusUrl.searchParams.set("unsubscribed", "1")
    return NextResponse.redirect(statusUrl)
}
