"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Postmortem {
  id: string
  title: string
  rootCause: string
  severity: "CRITICAL" | "MAJOR" | "MINOR"
  status: "DRAFT" | "PUBLISHED"
  incidentStart: string | null
  incidentEnd: string | null
  createdAt: string
  monitor: {
    id: string
    name: string
    url: string
  }
}

const severityConfig = {
  CRITICAL: { label: "Critical", variant: "destructive" },
  MAJOR: { label: "Major", variant: "secondary" },
  MINOR: { label: "Minor", variant: "outline" },
} as const

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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function PostmortemsPage() {
  const [postmortems, setPostmortems] = useState<Postmortem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPostmortems() {
      try {
        const response = await fetch('/api/postmortem')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch postmortems')
        }

        setPostmortems(data.postmortems || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPostmortems()
  }, [])

  const publishedCount = postmortems.filter(p => p.status === "PUBLISHED").length
  const draftCount = postmortems.filter(p => p.status === "DRAFT").length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Postmortems</h1>
          <p className="text-muted-foreground">Document and learn from incidents.</p>
        </div>
        <Link href="/dashboard/postmortems/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Postmortem
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Postmortems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postmortems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Postmortems</CardTitle>
          <CardDescription>Review past incidents and their resolutions</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              <p>{error}</p>
            </div>
          ) : postmortems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No postmortems yet</p>
              <p className="text-sm">Create your first postmortem to document an incident.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {postmortems.map((postmortem) => {
                const severity = severityConfig[postmortem.severity]
                const duration = formatDuration(postmortem.incidentStart, postmortem.incidentEnd)

                return (
                  <Link
                    key={postmortem.id}
                    href={`/dashboard/postmortems/${postmortem.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{postmortem.title}</p>
                          {postmortem.status === "DRAFT" && (
                            <Badge variant="outline" className="text-xs">
                              Draft
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {postmortem.monitor.name} • {formatDate(postmortem.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{duration}</p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                      <Badge variant={severity.variant as "destructive" | "secondary" | "outline"}>
                        {severity.label}
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
