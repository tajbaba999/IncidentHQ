import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params

        let body: { email?: unknown }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
        }

        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
        if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
        }

        const page = await prisma.statusPage.findUnique({
            where: { slug },
            select: { id: true, isPublished: true },
        })

        // Unpublished pages behave exactly like missing ones
        if (!page || !page.isPublished) {
            return NextResponse.json({ error: "Status page not found" }, { status: 404 })
        }

        // Idempotent: same response whether or not this email was already subscribed
        await prisma.statusSubscriber.upsert({
            where: { statusPageId_email: { statusPageId: page.id, email } },
            create: { statusPageId: page.id, email },
            update: {},
        })

        return NextResponse.json({ message: "Subscribed to updates" })

    } catch (error) {
        console.error("Error subscribing to status page:", error)
        return NextResponse.json(
            { error: "Failed to subscribe" },
            { status: 500 }
        )
    }
}
