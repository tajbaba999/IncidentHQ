"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { UptimeBar } from "@/components/dashboard/uptime-bar"
import { COMPONENT_STATUS_META } from "./status-meta"
import type { PublicGroup } from "@/lib/status-page"

interface ExpandableGroupProps {
  group: PublicGroup
}

export function ExpandableGroup({ group }: ExpandableGroupProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = COMPONENT_STATUS_META[group.status]

  return (
    <div className="border-b border-zinc-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-4 text-left hover:bg-zinc-50 transition-colors sm:px-6"
      >
        <div className="flex items-center gap-3">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
          <span className="font-medium text-zinc-900">{group.name}</span>
          <span className="text-sm text-zinc-500">
            {group.componentCount} component{group.componentCount !== 1 ? "s" : ""}
          </span>
          <span className="ml-auto flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-600">{group.uptimePercent}%</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-zinc-400 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </span>
        </div>
        <div className="mt-3">
          <UptimeBar
            data={group.days}
            startLabel="90 days ago"
            showLegend={false}
            mobileVisibleDays={30}
            labelsClassName="text-zinc-500"
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/60 px-4 py-4 sm:px-6">
          {group.components.length === 0 ? (
            <p className="text-sm text-zinc-500">No components in this group yet.</p>
          ) : (
            group.components.map(component => {
              const componentMeta = COMPONENT_STATUS_META[component.status]
              return (
                <div key={component.id}>
                  <div className="flex items-center gap-3">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", componentMeta.dot)} />
                    <span className="text-sm font-medium text-zinc-900">{component.name}</span>
                    <span className={cn("text-xs", componentMeta.text)}>{componentMeta.label}</span>
                    <span className="ml-auto text-xs font-medium text-zinc-500">
                      {component.uptimePercent}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <UptimeBar
                      data={component.days}
                      startLabel="90 days ago"
                      showLegend={false}
                      mobileVisibleDays={30}
                      labelsClassName="text-zinc-400"
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
