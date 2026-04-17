"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Clock, Edit, Loader2, Calendar, User, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

interface TimelineEvent {
  time: string
  event: string
}

interface Postmortem {
  id: string
  title: string
  rootCause: string
  timeline: TimelineEvent[]
  severity: "CRITICAL" | "MAJOR" | "MINOR"
  status: "DRAFT" | "PUBLISHED"
  summary: string | null
  resolution: string | null
  writtenBy: string | null
  incidentStart: string | null
  incidentEnd: string | null
  createdAt: string
  updatedAt: string
  monitor: {
    id: string
    name: string
    url: string
  }
  user: {
    name: string | null
    email: string
  }
}

const severityConfig = {
  CRITICAL: { label: "Critical", variant: "destructive", color: "bg-red-500" },
  MAJOR: { label: "Major", variant: "secondary", color: "bg-yellow-500" },
  MINOR: { label: "Minor", variant: "outline", color: "bg-blue-500" },
} as const

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "Unknown"

  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffMins = Math.round(diffMs / 60000)

  if (diffMins < 60) return `${diffMins} minutes`
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`
}

export default function PostmortemDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [postmortem, setPostmortem] = useState<Postmortem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPostmortem() {
      try {
        const response = await fetch(`/api/postmortem/${id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch postmortem')
        }

        setPostmortem(data.postmortem)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPostmortem()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !postmortem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/postmortems">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Postmortem Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error || "The requested postmortem could not be found."}
          </CardContent>
        </Card>
      </div>
    )
  }

  const severity = severityConfig[postmortem.severity]
  const duration = formatDuration(postmortem.incidentStart, postmortem.incidentEnd)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/postmortems">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{postmortem.title}</h1>
              {postmortem.status === "DRAFT" && (
                <Badge variant="outline">Draft</Badge>
              )}
              <Badge variant={severity.variant as "destructive" | "secondary" | "outline"}>
                {severity.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {postmortem.monitor.name} • {formatDateTime(postmortem.createdAt)}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/postmortems/${id}/edit`}>
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{duration}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Incident Start
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {postmortem.incidentStart ? formatDateTime(postmortem.incidentStart) : "Not set"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Incident End
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {postmortem.incidentEnd ? formatDateTime(postmortem.incidentEnd) : "Not set"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Written By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{postmortem.writtenBy || postmortem.user.name || postmortem.user.email}</div>
          </CardContent>
        </Card>
      </div>

      {/* Monitor Info */}
      <Card>
        <CardHeader>
          <CardTitle>Affected Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{postmortem.monitor.name}</p>
              <p className="text-sm text-muted-foreground">{postmortem.monitor.url}</p>
            </div>
            <a href={postmortem.monitor.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {postmortem.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Brief overview of the incident</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{postmortem.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Root Cause */}
      <Card>
        <CardHeader>
          <CardTitle>Root Cause</CardTitle>
          <CardDescription>What caused this incident</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">{postmortem.rootCause}</p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Sequence of events during the incident</CardDescription>
        </CardHeader>
        <CardContent>
          {postmortem.timeline && postmortem.timeline.length > 0 ? (
            <div className="relative border-l-2 border-muted pl-6 space-y-6">
              {postmortem.timeline.map((event, index) => (
                <div key={index} className="relative">
                  <div className={`absolute -left-[29px] w-4 h-4 rounded-full ${severity.color} border-4 border-background`} />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatDateTime(event.time)}
                    </p>
                    <p className="mt-1">{event.event}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No timeline events recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Resolution */}
      {postmortem.resolution && (
        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
            <CardDescription>How the incident was resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{postmortem.resolution}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
