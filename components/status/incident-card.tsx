import { cn } from "@/lib/utils"
import {
  formatOngoing,
  formatUtc,
  INCIDENT_STATUS_META,
  SEVERITY_META,
  type IncidentStatusKey,
} from "./status-meta"
import type { PublicIncident } from "@/lib/status-page"

interface IncidentCardProps {
  incident: PublicIncident
}

function StatusBadge({ status }: { status: IncidentStatusKey }) {
  const meta = INCIDENT_STATUS_META[status]
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", meta.badge)}>
      {meta.label}
    </span>
  )
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const severity = incident.severity ? SEVERITY_META[incident.severity] : null
  const isResolved = incident.status === "RESOLVED"

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-zinc-900">{incident.title}</h3>
        <StatusBadge status={incident.status} />
        {severity && (
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", severity.badge)}>
            {severity.label}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        Started {formatUtc(incident.startedAt)}
        {isResolved && incident.resolvedAt
          ? ` • Resolved ${formatUtc(incident.resolvedAt)}`
          : ` • Ongoing for ${formatOngoing(incident.startedAt)}`}
      </p>

      {incident.componentNames.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-500">Affected:</span>
          {incident.componentNames.map(name => (
            <span
              key={name}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {incident.updates.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
          {incident.updates.map(update => (
            <div key={update.id} className="flex gap-3">
              <div className="shrink-0 pt-0.5">
                <StatusBadge status={update.status} />
              </div>
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm text-zinc-700">{update.message}</p>
                <p className="mt-1 text-xs text-zinc-400">{formatUtc(update.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
