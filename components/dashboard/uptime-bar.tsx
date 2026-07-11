"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface UptimeDay {
  date: string
  status: "up" | "degraded" | "down"
  uptime: number
}

interface UptimeBarProps {
  data: UptimeDay[]
  startLabel?: string
  showLegend?: boolean
  // When set, only the most recent N cells are visible on small screens
  mobileVisibleDays?: number
  className?: string
  // Override label color for pages that don't use the app theme (public status page is always light)
  labelsClassName?: string
}

const statusColors = {
  up: "bg-emerald-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
}

export function UptimeBar({
  data,
  startLabel = "30 days ago",
  showLegend = true,
  mobileVisibleDays,
  className,
  labelsClassName = "text-muted-foreground",
}: UptimeBarProps) {
  if (data.length === 0) {
    return (
      <div className={cn("text-center py-8", labelsClassName)}>
        No uptime data available yet. Data will appear after health checks run.
      </div>
    )
  }

  const hiddenBefore =
    mobileVisibleDays !== undefined ? data.length - mobileVisibleDays : 0

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        <div className="flex gap-0.5">
          {data.map((day, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-8 flex-1 rounded-sm cursor-pointer",
                    statusColors[day.status],
                    index < hiddenBefore && "hidden sm:block",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{day.date}</p>
                <p className="text-xs text-muted-foreground">{day.uptime}% uptime</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className={cn("flex justify-between text-xs", labelsClassName)}>
          <span className={cn(hiddenBefore > 0 && "hidden sm:inline")}>{startLabel}</span>
          {hiddenBefore > 0 && (
            <span className="sm:hidden">{mobileVisibleDays} days ago</span>
          )}
          <span>Today</span>
        </div>
        {showLegend && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground">Operational</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-yellow-500" />
              <span className="text-muted-foreground">Degraded</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
              <span className="text-muted-foreground">Down</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
