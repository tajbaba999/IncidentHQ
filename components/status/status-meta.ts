export const COMPONENT_STATUS_META = {
  OPERATIONAL: { label: "Operational", dot: "bg-emerald-500", text: "text-emerald-600" },
  DEGRADED: { label: "Degraded", dot: "bg-yellow-500", text: "text-yellow-600" },
  DOWN: { label: "Down", dot: "bg-red-500", text: "text-red-600" },
  MAINTENANCE: { label: "Maintenance", dot: "bg-blue-500", text: "text-blue-600" },
} as const

export type ComponentStatusKey = keyof typeof COMPONENT_STATUS_META

export const PAGE_STATUS_HEADLINE: Record<ComponentStatusKey, string> = {
  OPERATIONAL: "All systems operational",
  DEGRADED: "Degraded performance",
  DOWN: "Service disruption",
  MAINTENANCE: "Maintenance in progress",
}

export const INCIDENT_STATUS_META = {
  INVESTIGATING: { label: "Investigating", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  IDENTIFIED: { label: "Identified", badge: "border-orange-200 bg-orange-50 text-orange-700" },
  MONITORING: { label: "Monitoring", badge: "border-blue-200 bg-blue-50 text-blue-700" },
  RESOLVED: { label: "Resolved", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
} as const

export type IncidentStatusKey = keyof typeof INCIDENT_STATUS_META

export const SEVERITY_META = {
  CRITICAL: { label: "Critical", badge: "border-red-200 bg-red-50 text-red-700" },
  MAJOR: { label: "Major", badge: "border-orange-200 bg-orange-50 text-orange-700" },
  MINOR: { label: "Minor", badge: "border-zinc-200 bg-zinc-50 text-zinc-600" },
} as const

export function formatUtc(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }) + " UTC"
}

export function formatOngoing(startedAtIso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}
