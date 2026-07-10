import { auth } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"

/**
 * Resolve the internal database userId for the current request.
 * Supports the x-test-auth header bypass in non-production environments.
 */
export async function getDbUserId(): Promise<string | null> {
    const headerPayload = await headers()
    const isTestMode = headerPayload.get('x-test-auth') === 'true' && process.env.NODE_ENV !== 'production'

    if (isTestMode) {
        return headerPayload.get('x-test-user-id')
    }

    const authResult = await auth()
    const clerkId = authResult.userId
    if (!clerkId) return null

    const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true }
    })

    return user?.id || null
}
