import { prisma } from "@/lib/prisma"

interface MonitorSchedule {
    monitorId: string
    intervalId: NodeJS.Timeout
    frequency: number
}

// Get base URL for API calls
const getBaseUrl = () => {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

class MonitorScheduler {
    private schedules: Map<string, MonitorSchedule> = new Map()
    private isRunning = false

    /**
     * Start the scheduler - loads all active monitors and schedules them
     */
    async start() {
        if (this.isRunning) {
            console.log("⏰ Scheduler already running")
            return
        }

        console.log("🚀 Starting Monitor Scheduler...")
        this.isRunning = true

        // Load all active monitors
        await this.loadActiveMonitors()

        // Check for new/updated monitors every minute
        setInterval(() => this.loadActiveMonitors(), 60000)
    }

    /**
     * Load all active monitors and schedule them
     */
    private async loadActiveMonitors() {
        try {
            const monitors = await prisma.monitor.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    frequency: true,
                }
            })

            console.log(`📊 Found ${monitors.length} active monitors`)

            // Remove schedules for monitors that are no longer active or have been deleted
            for (const [monitorId, schedule] of this.schedules) {
                const stillActive = monitors.find(m => m.id === monitorId)
                if (!stillActive) {
                    this.removeSchedule(monitorId)
                }
            }

            // Add or update schedules
            for (const monitor of monitors) {
                const existing = this.schedules.get(monitor.id)

                // If frequency changed, remove and re-add
                if (existing && existing.frequency !== monitor.frequency) {
                    this.removeSchedule(monitor.id)
                }

                // Add schedule if not exists
                if (!this.schedules.has(monitor.id)) {
                    this.addSchedule(monitor.id, monitor.frequency, monitor.name)
                }
            }

        } catch (error) {
            console.error("❌ Error loading monitors:", error)
        }
    }

    /**
     * Add a monitor to the scheduler
     */
    private addSchedule(monitorId: string, frequency: number, name: string) {
        const intervalMs = frequency * 1000 // Convert seconds to milliseconds

        console.log(`➕ Scheduling "${name}" (${monitorId}) - every ${frequency}s`)

        // Run immediately on schedule
        this.triggerHealthCheckAPI(monitorId, name)

        // Then run on interval
        const intervalId = setInterval(() => {
            this.triggerHealthCheckAPI(monitorId, name)
        }, intervalMs)

        this.schedules.set(monitorId, {
            monitorId,
            intervalId,
            frequency
        })
    }

    /**
     * Remove a monitor from the scheduler
     */
    private removeSchedule(monitorId: string) {
        const schedule = this.schedules.get(monitorId)
        if (schedule) {
            clearInterval(schedule.intervalId)
            this.schedules.delete(monitorId)
            console.log(`➖ Removed schedule: ${monitorId}`)
        }
    }

    /**
     * Makes a POST request to the health check API endpoint
     */
    private async triggerHealthCheckAPI(monitorId: string, name: string) {
        console.log(`🔍 Triggering API health check for "${name}"`)

        try {
            const response = await fetch(`${getBaseUrl()}/api/cron/health-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monitorId })
            })

            const result = await response.json()

            if (result.success) {
                console.log(`✅ "${name}" - ${result.statusCode} in ${result.responseTime}ms`)
            } else {
                console.log(`❌ "${name}" - ${result.message}`)
            }
        } catch (error) {
            console.error(`💥 API call failed for "${name}":`, error)
        }
    }

    /**
     * Stop the scheduler
     */
    stop() {
        for (const [monitorId] of this.schedules) {
            this.removeSchedule(monitorId)
        }
        this.isRunning = false
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeSchedules: this.schedules.size,
            monitors: Array.from(this.schedules.values()).map(s => ({
                monitorId: s.monitorId,
                frequency: s.frequency
            }))
        }
    }
}

// Singleton instance
export const monitorScheduler = new MonitorScheduler()

// Auto-start the scheduler when this module is imported
if (process.env.NODE_ENV !== 'test') {
    monitorScheduler.start().catch(console.error)
}
