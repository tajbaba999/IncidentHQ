import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET (link in the email body) never unsubscribes: email security scanners
 * prefetch links. It lands on the status page, which asks to confirm.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const token = request.nextUrl.searchParams.get("token")
    const statusUrl = new URL(`/status/${slug}`, request.url)
    if (token) statusUrl.searchParams.set("unsubscribe", token)
    return NextResponse.redirect(statusUrl)
}

/** Confirm button on the status page, and RFC 8058 one-click from mail clients. */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const token = request.nextUrl.searchParams.get("token")
    if (!token) {
        return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    try {
        // Idempotent: an already-used token still succeeds
        await prisma.statusSubscriber.deleteMany({
            where: { token, statusPage: { slug } },
        })
        return NextResponse.json({ message: "Unsubscribed" })
    } catch (error) {
        console.error("Error unsubscribing from status page:", error)
        return NextResponse.json(
            { error: "Failed to unsubscribe" },
            { status: 500 }
        )
    }
}
