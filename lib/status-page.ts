import { prisma } from "@/lib/prisma"
import { Prisma, ComponentStatus, IncidentStatus, Severity } from "@/lib/generated/prisma/client"

const DAY_MS = 24 * 60 * 60 * 1000

// =====================================
// Daily uptime aggregation
// =====================================

export type DayStatus = 'up' | 'degraded' | 'down'

export interface UptimeDay {
    date: string // YYYY-MM-DD (UTC)
    status: DayStatus
    uptime: number // 0–100, two decimals; 100 when no runs that day
}

interface DayBucket {
    total: number
    successes: number
}

// Same thresholds as app/api/monitor/[id]/stats/route.ts
export function statusForUptime(uptime: number): DayStatus {
    if (uptime < 90) return 'down'
    if (uptime < 99) return 'degraded'
    return 'up'
}

function round2(value: number): number {
    return Math.round(value * 100) / 100
}

function utcDayStart(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function dayKeysBack(days: number): string[] {
    const today = utcDayStart(new Date())
    const keys: string[] = []
    for (let i = days - 1; i >= 0; i--) {
        keys.push(new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10))
    }
    return keys
}

/**
 * One SQL aggregation for all monitors: per-monitor, per-UTC-day run counts.
 * Returns a map monitorId → array of `days` buckets, oldest first.
 * Days without runs have { total: 0, successes: 0 }.
 */
export async function getDailyUptime(
    monitorIds: string[],
    days = 90
): Promise<Map<string, DayBucket[]>> {
    const buckets = new Map<string, DayBucket[]>()
    if (monitorIds.length === 0) return buckets

    const dayKeys = dayKeysBack(days)
    const since = new Date(utcDayStart(new Date()).getTime() - (days - 1) * DAY_MS)

    const rows = await prisma.$queryRaw<
        Array<{ monitorId: string; day: Date; total: number; successes: number }>
    >`
        SELECT "monitorId",
               date_trunc('day', "createdAt") AS day,
               count(*)::int AS total,
               (count(*) FILTER (WHERE success))::int AS successes
        FROM "MonitorRun"
        WHERE "monitorId" IN (${Prisma.join(monitorIds)})
          AND "createdAt" >= ${since}
        GROUP BY 1, 2
    `

    const slotIndex = new Map(dayKeys.map((key, i) => [key, i]))
    for (const monitorId of monitorIds) {
        buckets.set(monitorId, dayKeys.map(() => ({ total: 0, successes: 0 })))
    }
    for (const row of rows) {
        const slots = buckets.get(row.monitorId)
        const index = slotIndex.get(row.day.toISOString().slice(0, 10))
        if (slots && index !== undefined) {
            slots[index] = { total: row.total, successes: row.successes }
        }
    }
    return buckets
}

function bucketsToDays(buckets: DayBucket[], dayKeys: string[]): UptimeDay[] {
    return buckets.map((bucket, i) => {
        const uptime = bucket.total > 0 ? round2((bucket.successes / bucket.total) * 100) : 100
        return { date: dayKeys[i], status: statusForUptime(uptime), uptime }
    })
}

function sumBuckets(memberBuckets: DayBucket[][], days: number): DayBucket[] {
    const summed: DayBucket[] = Array.from({ length: days }, () => ({ total: 0, successes: 0 }))
    for (const slots of memberBuckets) {
        slots.forEach((bucket, i) => {
            summed[i].total += bucket.total
            summed[i].successes += bucket.successes
        })
    }
    return summed
}

function aggregateUptimePercent(buckets: DayBucket[]): number {
    const total = buckets.reduce((sum, b) => sum + b.total, 0)
    const successes = buckets.reduce((sum, b) => sum + b.successes, 0)
    return total > 0 ? round2((successes / total) * 100) : 100
}

// =====================================
// Status rollup
// =====================================

const STATUS_SEVERITY: Record<ComponentStatus, number> = {
    OPERATIONAL: 0,
    MAINTENANCE: 1,
    DEGRADED: 2,
    DOWN: 3,
}

export function worstStatus(statuses: ComponentStatus[]): ComponentStatus {
    let worst: ComponentStatus = 'OPERATIONAL'
    for (const status of statuses) {
        if (STATUS_SEVERITY[status] > STATUS_SEVERITY[worst]) worst = status
    }
    return worst
}

// =====================================
// Public status page DTO
// =====================================

export interface PublicComponent {
    id: string
    name: string
    status: ComponentStatus
    uptimePercent: number
    days: UptimeDay[]
}

export interface PublicGroup {
    id: string
    name: string
    status: ComponentStatus
    componentCount: number
    uptimePercent: number
    days: UptimeDay[]
    components: PublicComponent[]
}

export interface PublicIncidentUpdate {
    id: string
    status: IncidentStatus
    message: string
    createdAt: string
}

export interface PublicIncident {
    id: string
    title: string
    severity: Severity | null
    status: IncidentStatus
    startedAt: string
    componentNames: string[]
    updates: PublicIncidentUpdate[] // newest first
}

export interface PublicStatusPage {
    id: string
    slug: string
    name: string
    description: string | null
    logoUrl: string | null
    brandColor: string | null
    overallStatus: ComponentStatus
    groups: PublicGroup[]
    activeIncidents: PublicIncident[]
}

/**
 * Everything the public /status/[slug] page needs, fully serializable.
 * Returns null when the page doesn't exist or isn't published.
 */
export async function getPublicStatusPage(
    slug: string,
    days = 90
): Promise<PublicStatusPage | null> {
    const page = await prisma.statusPage.findUnique({
        where: { slug },
        include: {
            groups: {
                orderBy: { displayOrder: 'asc' },
                include: {
                    components: {
                        orderBy: { displayOrder: 'asc' },
                    },
                },
            },
            incidents: {
                where: { status: { not: 'RESOLVED' } },
                orderBy: { startedAt: 'desc' },
                include: {
                    updates: { orderBy: { createdAt: 'desc' } },
                    components: {
                        include: { component: { select: { displayName: true } } },
                    },
                },
            },
        },
    })

    if (!page || !page.isPublished) return null

    const allComponents = page.groups.flatMap(group => group.components)
    const monitorIds = allComponents.map(component => component.monitorId)
    const dayKeys = dayKeysBack(days)

    const [uptimeByMonitor, latestRuns] = await Promise.all([
        getDailyUptime(monitorIds, days),
        monitorIds.length > 0
            ? prisma.monitorRun.findMany({
                  where: { monitorId: { in: monitorIds } },
                  orderBy: { createdAt: 'desc' },
                  distinct: ['monitorId'],
                  select: { monitorId: true, success: true },
              })
            : Promise.resolve([]),
    ])

    const latestRunByMonitor = new Map(latestRuns.map(run => [run.monitorId, run.success]))

    const emptyBuckets = () => dayKeys.map(() => ({ total: 0, successes: 0 }))

    const groups: PublicGroup[] = page.groups.map(group => {
        const components: PublicComponent[] = group.components.map(component => {
            const buckets = uptimeByMonitor.get(component.monitorId) ?? emptyBuckets()
            const lastSuccess = latestRunByMonitor.get(component.monitorId)
            const autoStatus: ComponentStatus = lastSuccess === false ? 'DOWN' : 'OPERATIONAL'
            return {
                id: component.id,
                name: component.displayName,
                status: component.manualStatus ?? autoStatus,
                uptimePercent: aggregateUptimePercent(buckets),
                days: bucketsToDays(buckets, dayKeys),
            }
        })

        const memberBuckets = group.components.map(
            component => uptimeByMonitor.get(component.monitorId) ?? emptyBuckets()
        )
        const groupBuckets = sumBuckets(memberBuckets, dayKeys.length)

        return {
            id: group.id,
            name: group.name,
            status: worstStatus(components.map(component => component.status)),
            componentCount: components.length,
            uptimePercent: aggregateUptimePercent(groupBuckets),
            days: bucketsToDays(groupBuckets, dayKeys),
            components,
        }
    })

    const activeIncidents: PublicIncident[] = page.incidents.map(incident => ({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        startedAt: incident.startedAt.toISOString(),
        componentNames: incident.components.map(join => join.component.displayName),
        updates: incident.updates.map(update => ({
            id: update.id,
            status: update.status,
            message: update.message,
            createdAt: update.createdAt.toISOString(),
        })),
    }))

    return {
        id: page.id,
        slug: page.slug,
        name: page.name,
        description: page.description,
        logoUrl: page.logoUrl,
        brandColor: page.brandColor,
        overallStatus: worstStatus(groups.map(group => group.status)),
        groups,
        activeIncidents,
    }
}
