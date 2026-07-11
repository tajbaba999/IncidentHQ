"use client"

import type React from "react"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CheckCircle2, Loader2, Megaphone, MessageSquarePlus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { IncidentItem, StatusPageConfig } from "./types"

const INCIDENT_STATUS_OPTIONS = [
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "IDENTIFIED", label: "Identified" },
  { value: "MONITORING", label: "Monitoring" },
  { value: "RESOLVED", label: "Resolved" },
]

const STATUS_BADGE: Record<string, string> = {
  INVESTIGATING: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  IDENTIFIED: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  MONITORING: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  RESOLVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
}

const SEVERITY_OPTIONS = [
  { value: "NONE", label: "No severity" },
  { value: "MINOR", label: "Minor" },
  { value: "MAJOR", label: "Major" },
  { value: "CRITICAL", label: "Critical" },
]

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "border-red-500/30 bg-red-500/10 text-red-500",
  MAJOR: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  MINOR: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
}

function statusLabel(status: string): string {
  return INCIDENT_STATUS_OPTIONS.find(option => option.value === status)?.label ?? status
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface IncidentsTabProps {
  statusPage: StatusPageConfig
}

export function IncidentsTab({ statusPage }: IncidentsTabProps) {
  const [incidents, setIncidents] = useState<IncidentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Report incident form
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState("NONE")
  const [status, setStatus] = useState("INVESTIGATING")
  const [message, setMessage] = useState("")
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set())

  // Post-update form (one open at a time)
  const [updateFor, setUpdateFor] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState("INVESTIGATING")
  const [updateMessage, setUpdateMessage] = useState("")

  const baseUrl = `/api/status-page/${statusPage.id}/incidents`

  const refetch = useCallback(async () => {
    try {
      const response = await fetch(baseUrl)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch incidents')
      }
      setIncidents(data.incidents)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents')
    } finally {
      setLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    refetch()
  }, [refetch])

  const request = async (url: string, method: string, body?: unknown) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(url, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }
      await refetch()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    const ok = await request(baseUrl, 'POST', {
      title: title.trim(),
      severity: severity === "NONE" ? null : severity,
      status,
      message: message.trim(),
      componentIds: Array.from(selectedComponents),
    })
    if (ok) {
      setTitle("")
      setSeverity("NONE")
      setStatus("INVESTIGATING")
      setMessage("")
      setSelectedComponents(new Set())
    }
  }

  const openUpdateForm = (incident: IncidentItem) => {
    setUpdateFor(incident.id)
    setUpdateStatus(incident.status)
    setUpdateMessage("")
  }

  const handlePostUpdate = async (incidentId: string) => {
    if (!updateMessage.trim()) return
    const ok = await request(`${baseUrl}/${incidentId}/updates`, 'POST', {
      status: updateStatus,
      message: updateMessage.trim(),
    })
    if (ok) {
      setUpdateFor(null)
      setUpdateMessage("")
    }
  }

  const handleResolve = async (incidentId: string) => {
    await request(`${baseUrl}/${incidentId}/updates`, 'POST', {
      status: 'RESOLVED',
      message: 'This incident has been resolved.',
    })
  }

  const toggleComponent = (componentId: string) => {
    setSelectedComponents(prev => {
      const next = new Set(prev)
      if (next.has(componentId)) {
        next.delete(componentId)
      } else {
        next.add(componentId)
      }
      return next
    })
  }

  const activeIncidents = incidents.filter(incident => incident.status !== 'RESOLVED')
  const resolvedIncidents = incidents.filter(incident => incident.status === 'RESOLVED')
  const hasComponents = statusPage.groups.some(group => group.components.length > 0)

  const renderIncident = (incident: IncidentItem) => {
    const isResolved = incident.status === 'RESOLVED'
    return (
      <Card key={incident.id}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{incident.title}</CardTitle>
                <Badge variant="outline" className={STATUS_BADGE[incident.status]}>
                  {statusLabel(incident.status)}
                </Badge>
                {incident.severity && (
                  <Badge variant="outline" className={SEVERITY_BADGE[incident.severity]}>
                    {incident.severity.charAt(0) + incident.severity.slice(1).toLowerCase()}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Started {formatDate(incident.startedAt)}
                {incident.resolvedAt && ` • Resolved ${formatDate(incident.resolvedAt)}`}
              </p>
              {incident.components.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {incident.components.map(join => (
                    <Badge key={join.component.id} variant="secondary" className="text-xs">
                      {join.component.displayName}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isResolved && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={busy}
                    onClick={() => openUpdateForm(incident)}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    Post update
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-emerald-500 hover:text-emerald-400"
                    disabled={busy}
                    onClick={() => handleResolve(incident.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve
                  </Button>
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={busy}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete incident &quot;{incident.title}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the incident and all its updates from the public
                      status page and its history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => request(`${baseUrl}/${incident.id}`, 'DELETE')}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {updateFor === incident.id && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-xs text-muted-foreground">New status</Label>
                <Select value={updateStatus} onValueChange={setUpdateStatus} disabled={busy}>
                  <SelectTrigger className="h-8 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="What's the latest? Subscribers will see this update."
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy || !updateMessage.trim()}
                  onClick={() => handlePostUpdate(incident.id)}
                  className="gap-2"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Post update
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setUpdateFor(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {incident.updates.map(update => (
              <div key={update.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      update.status === 'RESOLVED' ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  <span className="w-px flex-1 bg-border" />
                </div>
                <div className="pb-3">
                  <p className="text-xs font-medium">
                    {statusLabel(update.status)}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatDate(update.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {update.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Report Incident</CardTitle>
          <CardDescription>
            Publishes to your status page immediately. Each update is shown in the incident timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="incident-title">Title</Label>
              <Input
                id="incident-title"
                placeholder="e.g. Elevated error rates on the API"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident-message">Initial update</Label>
              <Textarea
                id="incident-message"
                placeholder="We are investigating reports of…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Affected components</Label>
              {hasComponents ? (
                <div className="space-y-3">
                  {statusPage.groups
                    .filter(group => group.components.length > 0)
                    .map(group => (
                      <div key={group.id}>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                          {group.name}
                        </p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          {group.components.map(component => (
                            <label
                              key={component.id}
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={selectedComponents.has(component.id)}
                                onCheckedChange={() => toggleComponent(component.id)}
                              />
                              {component.displayName}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No components yet — add them in the Components tab to link incidents to them.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={busy || !title.trim() || !message.trim()}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Report incident
            </Button>
          </form>
        </CardContent>
      </Card>

      {incidents.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No incidents reported</p>
              <p className="text-sm">When something goes wrong, report it here to keep visitors informed.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeIncidents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Active
              </h3>
              {activeIncidents.map(renderIncident)}
            </div>
          )}
          {resolvedIncidents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Resolved
              </h3>
              {resolvedIncidents.map(renderIncident)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
