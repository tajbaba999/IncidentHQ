"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Monitor {
    id: string
    name: string
    url: string
    project: {
        id: string
        name: string
    }
}

interface TimelineEvent {
    time: string
    event: string
}

export default function NewPostmortemPage() {
    const router = useRouter()
    const [monitors, setMonitors] = useState<Monitor[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [monitorId, setMonitorId] = useState("")
    const [title, setTitle] = useState("")
    const [rootCause, setRootCause] = useState("")
    const [severity, setSeverity] = useState("MINOR")
    const [summary, setSummary] = useState("")
    const [resolution, setResolution] = useState("")
    const [writtenBy, setWrittenBy] = useState("")
    const [incidentStart, setIncidentStart] = useState("")
    const [incidentEnd, setIncidentEnd] = useState("")
    const [timeline, setTimeline] = useState<TimelineEvent[]>([
        { time: "", event: "" }
    ])

    useEffect(() => {
        async function fetchMonitors() {
            try {
                const response = await fetch('/api/monitor')
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch monitors')
                }

                setMonitors(data.monitors || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load monitors')
            } finally {
                setLoading(false)
            }
        }

        fetchMonitors()
    }, [])

    const addTimelineEvent = () => {
        setTimeline([...timeline, { time: "", event: "" }])
    }

    const removeTimelineEvent = (index: number) => {
        if (timeline.length > 1) {
            setTimeline(timeline.filter((_, i) => i !== index))
        }
    }

    const updateTimelineEvent = (index: number, field: 'time' | 'event', value: string) => {
        const updated = [...timeline]
        updated[index][field] = value
        setTimeline(updated)
    }

    const handleSubmit = async (e: React.FormEvent, status: 'DRAFT' | 'PUBLISHED') => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        try {
            // Filter out empty timeline events and format times as ISO strings
            const formattedTimeline = timeline
                .filter(t => t.time && t.event)
                .map(t => ({
                    time: new Date(t.time).toISOString(),
                    event: t.event
                }))

            const response = await fetch('/api/postmortem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    monitorId,
                    title,
                    rootCause,
                    severity,
                    status,
                    summary: summary || null,
                    resolution: resolution || null,
                    writtenBy: writtenBy || null,
                    incidentStart: incidentStart ? new Date(incidentStart).toISOString() : null,
                    incidentEnd: incidentEnd ? new Date(incidentEnd).toISOString() : null,
                    timeline: formattedTimeline
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create postmortem')
            }

            router.push(`/dashboard/postmortems/${data.postmortem.id}`)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create postmortem')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/postmortems">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New Postmortem</h1>
                    <p className="text-muted-foreground">Document what happened and how it was resolved.</p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
                    {error}
                </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, 'DRAFT')}>
                <div className="grid gap-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Incident Details</CardTitle>
                            <CardDescription>Basic information about the incident</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="monitor">Affected Monitor *</Label>
                                <Select value={monitorId} onValueChange={setMonitorId} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a monitor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monitors.map(monitor => (
                                            <SelectItem key={monitor.id} value={monitor.id}>
                                                {monitor.name} ({monitor.project.name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Database Cluster Outage"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="severity">Severity</Label>
                                    <Select value={severity} onValueChange={setSeverity}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MINOR">Minor</SelectItem>
                                            <SelectItem value="MAJOR">Major</SelectItem>
                                            <SelectItem value="CRITICAL">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="writtenBy">Written By</Label>
                                    <Input
                                        id="writtenBy"
                                        placeholder="Your name"
                                        value={writtenBy}
                                        onChange={(e) => setWrittenBy(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="incidentStart">Incident Start</Label>
                                    <Input
                                        id="incidentStart"
                                        type="datetime-local"
                                        value={incidentStart}
                                        onChange={(e) => setIncidentStart(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="incidentEnd">Incident End</Label>
                                    <Input
                                        id="incidentEnd"
                                        type="datetime-local"
                                        value={incidentEnd}
                                        onChange={(e) => setIncidentEnd(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="summary">Summary</Label>
                                <Textarea
                                    id="summary"
                                    placeholder="Brief summary of what happened..."
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Root Cause */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Root Cause Analysis</CardTitle>
                            <CardDescription>Explain what caused the incident</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Describe the root cause of the incident..."
                                value={rootCause}
                                onChange={(e) => setRootCause(e.target.value)}
                                rows={4}
                                required
                            />
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Timeline of Events</CardTitle>
                            <CardDescription>Document what happened and when</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {timeline.map((event, index) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <div className="grid gap-2 w-48">
                                        <Input
                                            type="datetime-local"
                                            value={event.time}
                                            onChange={(e) => updateTimelineEvent(index, 'time', e.target.value)}
                                            placeholder="Time"
                                        />
                                    </div>
                                    <div className="flex-1 grid gap-2">
                                        <Input
                                            value={event.event}
                                            onChange={(e) => updateTimelineEvent(index, 'event', e.target.value)}
                                            placeholder="What happened?"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeTimelineEvent(index)}
                                        disabled={timeline.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addTimelineEvent} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Event
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Resolution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Resolution</CardTitle>
                            <CardDescription>How was the issue fixed?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Describe how the incident was resolved and any follow-up actions..."
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                rows={4}
                            />
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Link href="/dashboard/postmortems">
                            <Button type="button" variant="outline">Cancel</Button>
                        </Link>
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={submitting || !monitorId || !title || !rootCause}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save as Draft
                        </Button>
                        <Button
                            type="button"
                            disabled={submitting || !monitorId || !title || !rootCause}
                            onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Publish
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
