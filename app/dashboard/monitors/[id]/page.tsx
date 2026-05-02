"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Edit, Pause, Play, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { ResponseTimeChart } from "@/components/dashboard/response-time-chart"
import { LogsTable } from "@/components/dashboard/logs-table"
import { UptimeBar } from "@/components/dashboard/uptime-bar"
import { toast } from "sonner"

interface MonitorStats {
  monitor: {
    id: string
    name: string
    url: string
    frequency: number
    isActive: boolean
    createdAt: string
  }
  stats: {
    uptime: number
    avgResponseTime: number
    totalChecks: number
    lastCheck: string | null
    lastStatus: "operational" | "down" | "unknown"
    lastStatusCode: number | null
  }
  dailyUptime: { date: string; status: "up" | "degraded" | "down"; uptime: number }[]
  allResponseTimes: { time: string; responseTime: number; timestamp?: string }[]
  recentLogs: {
    id: string
    timestamp: string
    statusCode: number | null
    responseTime: number | null
    success: boolean
    message: string | null
    result: "success" | "failure"
  }[]
}

const statusConfig = {
  operational: { label: "Operational", color: "bg-emerald-500", variant: "default" },
  degraded: { label: "Degraded", color: "bg-yellow-500", variant: "secondary" },
  down: { label: "Down", color: "bg-red-500", variant: "destructive" },
  unknown: { label: "Unknown", color: "bg-gray-500", variant: "secondary" },
} as const

function formatFrequency(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  return `${Math.floor(seconds / 3600)} hr`
}

function formatLastCheck(dateString: string | null): string {
  if (!dateString) return "Never"
  const diffSecs = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`
  return `${Math.floor(diffSecs / 86400)}d ago`
}

export default function MonitorDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const monitorId = params.id as string

  const [data, setData] = useState<MonitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/monitor/${monitorId}/stats`)
      if (!response.ok) throw new Error("Failed to fetch monitor data")
      setData(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monitor")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [monitorId])

  const handleTogglePause = async () => {
    if (!data) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/monitor/${monitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !data.monitor.isActive }),
      })
      if (!res.ok) throw new Error()
      toast.success(data.monitor.isActive ? "Monitor paused" : "Monitor resumed")
      fetchData()
    } catch {
      toast.error("Failed to update monitor")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/monitor/${monitorId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Monitor deleted")
      router.push("/dashboard/monitors")
    } catch {
      toast.error("Failed to delete monitor")
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-destructive">{error || "Monitor not found"}</p>
        <Link href="/dashboard/monitors">
          <Button variant="outline">Back to Monitors</Button>
        </Link>
      </div>
    )
  }

  const { monitor, stats, dailyUptime, allResponseTimes, recentLogs } = data
  const config = statusConfig[stats.lastStatus as keyof typeof statusConfig] || statusConfig.unknown

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/monitors">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{monitor.name}</h1>
              <Badge variant={config.variant as "default" | "secondary" | "destructive"}>{config.label}</Badge>
              {!monitor.isActive && <Badge variant="secondary">Paused</Badge>}
            </div>
            <p className="text-muted-foreground">{monitor.url}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleTogglePause} disabled={actionLoading}>
            {monitor.isActive ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Resume</>}
          </Button>
          <Link href={`/dashboard/monitors/${monitorId}/edit`}>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Edit className="h-4 w-4" />Edit
            </Button>
          </Link>
          <Button
            variant="outline" size="sm"
            className="gap-2 text-destructive hover:text-destructive bg-transparent"
            onClick={() => setDeleteOpen(true)}
            disabled={actionLoading}
          >
            <Trash2 className="h-4 w-4" />Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Uptime", value: `${stats.uptime}%`, sub: "Last 30 days" },
          { label: "Avg Response", value: `${stats.avgResponseTime}ms`, sub: "Last 24 hours" },
          { label: "Check Frequency", value: formatFrequency(monitor.frequency), sub: "Interval" },
          { label: "Last Check", value: formatLastCheck(stats.lastCheck), sub: stats.lastStatusCode ? `HTTP ${stats.lastStatusCode}` : "N/A" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uptime History</CardTitle>
          <CardDescription>Last 30 days availability</CardDescription>
        </CardHeader>
        <CardContent><UptimeBar data={dailyUptime} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Time</CardTitle>
          <CardDescription>Average response time over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent><ResponseTimeChart data={allResponseTimes} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
          <CardDescription>Latest check results ({stats.totalChecks} total checks)</CardDescription>
        </CardHeader>
        <CardContent><LogsTable logs={recentLogs} /></CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete monitor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{monitor.name}</strong> and all its historical data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Monitor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
