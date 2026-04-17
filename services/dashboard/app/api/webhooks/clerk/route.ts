import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    // Get the body first
    const payload = await req.json()
    const body = JSON.stringify(payload)

    let evt: WebhookEvent

    // Development bypass - skip verification when using test header
    const headerPayload = await headers()
    const isTestMode = headerPayload.get('x-test-webhook') === 'true' && process.env.NODE_ENV !== 'production'

    if (isTestMode) {
        // In test mode, use the payload directly without verification
        console.log('⚠️ TEST MODE: Skipping webhook verification')
        evt = payload as WebhookEvent
    } else {
        // Get the Svix headers for verification
        const svix_id = headerPayload.get('svix-id')
        const svix_timestamp = headerPayload.get('svix-timestamp')
        const svix_signature = headerPayload.get('svix-signature')

        // If there are no headers, error out
        if (!svix_id || !svix_timestamp || !svix_signature) {
            return new Response('Error: Missing svix headers', { status: 400 })
        }

        // Get the Clerk webhook secret from environment variables
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

        if (!WEBHOOK_SECRET) {
            throw new Error('Please add CLERK_WEBHOOK_SECRET to your .env file')
        }

        // Create a new Svix instance with your webhook secret
        const wh = new Webhook(WEBHOOK_SECRET)

        // Verify the webhook signature
        try {
            evt = wh.verify(body, {
                'svix-id': svix_id,
                'svix-timestamp': svix_timestamp,
                'svix-signature': svix_signature,
            }) as WebhookEvent
        } catch (err) {
            console.error('Error verifying webhook:', err)
            return new Response('Error: Verification failed', { status: 400 })
        }
    }

    // Handle the webhook event
    const eventType = evt.type

    try {
        switch (eventType) {
            case 'user.created': {
                const { id, email_addresses, first_name, last_name, image_url } = evt.data

                // Create user in your database
                await prisma.user.create({
                    data: {
                        clerkId: id,
                        email: email_addresses[0]?.email_address || '',
                        firstName: first_name || null,
                        lastName: last_name || null,
                        imageUrl: image_url || null,
                    },
                })

                console.log(`✅ User created: ${email_addresses[0]?.email_address}`)
                break
            }

            case 'user.updated': {
                const { id, email_addresses, first_name, last_name, image_url } = evt.data

                // Update user in your database
                await prisma.user.update({
                    where: { clerkId: id },
                    data: {
                        email: email_addresses[0]?.email_address || '',
                        firstName: first_name || null,
                        lastName: last_name || null,
                        imageUrl: image_url || null,
                    },
                })

                console.log(`✅ User updated: ${email_addresses[0]?.email_address}`)
                break
            }

            case 'user.deleted': {
                const { id } = evt.data

                if (id) {
                    // Delete user from your database
                    await prisma.user.delete({
                        where: { clerkId: id },
                    })

                    console.log(`✅ User deleted: ${id}`)
                }
                break
            }

            default:
                console.log(`⚠️ Unhandled webhook event type: ${eventType}`)
        }

        return new Response('Webhook processed successfully', { status: 200 })
    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response('Error processing webhook', { status: 500 })
    }
}
