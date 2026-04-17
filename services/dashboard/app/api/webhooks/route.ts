import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        // Parse the incoming webhook payload
        const body = await req.json()

        // Log the webhook payload for debugging
        console.log('Webhook received:', JSON.stringify(body, null, 2))

        // You can add your webhook processing logic here
        // For example, handling monitor notifications, alerts, etc.

        return NextResponse.json({
            success: true,
            message: 'Webhook received successfully',
            timestamp: new Date().toISOString(),
            receivedData: body
        }, { status: 200 })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to process webhook'
        }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    return NextResponse.json({
        message: 'Webhook endpoint is active',
        methods: ['POST'],
        timestamp: new Date().toISOString()
    })
}
