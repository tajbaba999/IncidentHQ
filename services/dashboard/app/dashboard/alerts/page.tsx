"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { AlertsList } from "@/components/dashboard/alerts-list"

interface AlertStats {
  activeIncidents: number
  resolvedToday: number
  totalAlerts: number
}

export default function AlertsPage() {
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/alerts')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (err) {
        console.error('Failed to fetch alert stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const alertStats = [
    {
      title: "Active Incidents",
      value: loading ? "-" : stats?.activeIncidents?.toString() || "0",
      icon: AlertTriangle,
      color: "text-red-500",
    },
    {
      title: "Resolved Today",
      value: loading ? "-" : stats?.resolvedToday?.toString() || "0",
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      title: "Total Failures",
      value: loading ? "-" : stats?.totalAlerts?.toString() || "0",
      icon: Clock,
      color: "text-muted-foreground",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground">View failed health checks across all monitors.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {alertStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Failures
            <Badge variant="secondary" className="ml-2">
              {stats?.totalAlerts || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Failed Health Checks</CardTitle>
              <CardDescription>History of failed health checks across all monitors</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
