"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { MonitorsList } from "@/components/dashboard/monitors-list"
import { UptimeChart } from "@/components/dashboard/uptime-chart"

interface DashboardStats {
  totalMonitors: number
  operationalCount: number
  incidentsCount: number
  avgResponseTime: number
  overallUptime: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const statsCards = [
    {
      title: "Total Monitors",
      value: loading ? "-" : stats?.totalMonitors?.toString() || "0",
      description: "Active monitors",
      icon: Activity,
    },
    {
      title: "Operational",
      value: loading ? "-" : stats?.operationalCount?.toString() || "0",
      description: stats ? `${Math.round((stats.operationalCount / (stats.totalMonitors || 1)) * 100)}% of monitors` : "Loading...",
      icon: CheckCircle2,
    },
    {
      title: "Incidents",
      value: loading ? "-" : stats?.incidentsCount?.toString() || "0",
      description: "Monitors currently down",
      icon: AlertTriangle,
    },
    {
      title: "Avg Response",
      value: loading ? "-" : `${stats?.avgResponseTime || 0}ms`,
      description: "Last 24 hours",
      icon: Clock,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Monitor your API health and performance at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Uptime Overview</CardTitle>
            <CardDescription>Last 24 hours performance across all monitors</CardDescription>
          </CardHeader>
          <CardContent>
            <UptimeChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest monitor status changes</CardDescription>
          </CardHeader>
          <CardContent>
            <MonitorsList limit={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
