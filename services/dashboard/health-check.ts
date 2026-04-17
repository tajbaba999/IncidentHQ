import { prisma } from "@/lib/prisma"
import { sendMonitorFailureEmail } from "@/lib/email"

export interface HealthCheckResult {
    success: boolean
    statusCode?: number
    responseTime?: number
    message?: string
}

/**
 * Performs a health check on a monitor by making an HTTP request
 * and recording the results in the MonitorRun table
 */
export async function performHealthCheck(monitorId: string): Promise<HealthCheckResult> {
    try {
        // Fetch monitor details including user email for notifications
        const monitor = await prisma.monitor.findUnique({
            where: { id: monitorId },
            select: {
                id: true,
                name: true,
                url: true,
                method: true,
                expectedStatus: true,
                authType: true,
                authData: true,
                isActive: true,
                project: {
                    select: {
                        user: {
                            select: { email: true }
                        }
                    }
                }
            }
        })

        if (!monitor) {
            throw new Error(`Monitor ${monitorId} not found`)
        }

        if (!monitor.isActive) {
            return {
                success: false,
                message: "Monitor is not active"
            }
        }

        // Prepare request options
        const headers: HeadersInit = {
            'User-Agent': 'PulsePing-Monitor/1.0'
        }

        // Add authentication if configured
        if (monitor.authType === 'BEARER' && monitor.authData) {
            const authData = monitor.authData as { token?: string }
            if (authData.token) {
                headers['Authorization'] = `Bearer ${authData.token}`
            }
        } else if (monitor.authType === 'HEADER' && monitor.authData) {
            const authData = monitor.authData as Record<string, string>
            Object.entries(authData).forEach(([key, value]) => {
                headers[key] = value
            })
        } else if (monitor.authType === 'BASIC' && monitor.authData) {
            const authData = monitor.authData as { username?: string; password?: string }
            if (authData.username && authData.password) {
                const basicAuth = Buffer.from(`${authData.username}:${authData.password}`).toString('base64')
                headers['Authorization'] = `Basic ${basicAuth}`
            }
        }

        // Perform the health check
        const startTime = Date.now()

        const response = await fetch(monitor.url, {
            method: monitor.method,
            headers,
            redirect: 'follow',
            signal: AbortSignal.timeout(30000) // 30 second timeout
        })

        const endTime = Date.now()
        const responseTime = endTime - startTime
        const statusCode = response.status
        const success = statusCode === monitor.expectedStatus

        const failureMessage = `Expected status ${monitor.expectedStatus}, got ${statusCode}`

        // Store the result
        await prisma.monitorRun.create({
            data: {
                monitorId: monitor.id,
                statusCode,
                responseTime,
                success,
                message: success ? "Health check passed" : failureMessage
            }
        })

        // Send email notification on failure
        if (!success && monitor.project?.user?.email) {
            await sendMonitorFailureEmail({
                to: monitor.project.user.email,
                monitorName: monitor.name,
                url: monitor.url,
                statusCode,
                message: failureMessage,
                responseTime
            })
        }

        return {
            success,
            statusCode,
            responseTime,
            message: success ? "Health check passed" : failureMessage
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"

        // Try to get monitor info for email notification
        let userEmail: string | undefined
        let monitorName = 'Unknown Monitor'
        let monitorUrl = 'N/A'

        try {
            const monitorInfo = await prisma.monitor.findUnique({
                where: { id: monitorId },
                select: {
                    name: true,
                    url: true,
                    project: {
                        select: {
                            user: { select: { email: true } }
                        }
                    }
                }
            })
            if (monitorInfo) {
                monitorName = monitorInfo.name
                monitorUrl = monitorInfo.url
                userEmail = monitorInfo.project?.user?.email
            }
        } catch (lookupError) {
            console.error("Failed to fetch monitor info for email:", lookupError)
        }

        // Try to store the failed result
        try {
            await prisma.monitorRun.create({
                data: {
                    monitorId,
                    success: false,
                    message: errorMessage
                }
            })
        } catch (dbError) {
            console.error("Failed to store error result:", dbError)
        }

        // Send email notification for exception
        if (userEmail) {
            await sendMonitorFailureEmail({
                to: userEmail,
                monitorName,
                url: monitorUrl,
                message: errorMessage
            })
        }

        return {
            success: false,
            message: errorMessage
        }
    }
}

/**
 * Get recent monitor runs for a specific monitor
 */
export async function getMonitorRuns(monitorId: string, limit: number = 50) {
    return await prisma.monitorRun.findMany({
        where: { monitorId },
        orderBy: { createdAt: 'desc' },
        take: limit
    })
}
