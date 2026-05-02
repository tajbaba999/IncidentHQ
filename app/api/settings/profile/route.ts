import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { firstName, lastName } = await request.json()

    const clerk = await clerkClient()
    await clerk.users.updateUser(clerkId, { firstName, lastName })

    await prisma.user.update({
      where: { clerkId },
      data: { firstName, lastName, name: `${firstName ?? ""} ${lastName ?? ""}`.trim() },
    })

    return NextResponse.json({ message: "Profile updated" })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
