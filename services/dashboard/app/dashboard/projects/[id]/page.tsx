"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Loader2,
    Monitor,
    Plus,
    Trash2,
    CheckCircle2,
    XCircle,
    ExternalLink
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface MonitorData {
    id: string
    name: string
    url: string
    method: string
    expectedStatus: number
    frequency: number
    isActive: boolean
    createdAt: string
    _count: {
        monitorRuns: number
    }
}

interface Project {
    id: string
    name: string
    description: string | null
    createdAt: string
    updatedAt: string
    monitors: MonitorData[]
    _count: {
        monitors: number
    }
}

export default function ProjectDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        async function fetchProject() {
            try {
                const response = await fetch(`/api/project/${id}`)
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch project')
                }

                setProject(data.project)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }

        fetchProject()
    }, [id])

    const handleDelete = async () => {
        if (!project) return

        const confirmed = window.confirm(
            `Are you sure you want to delete "${project.name}"? This will also delete all ${project._count.monitors} monitors. This action cannot be undone.`
        )

        if (!confirmed) return

        setDeleting(true)
        try {
            const response = await fetch(`/api/project/${id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete project')
            }

            router.push('/dashboard/projects')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete project')
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !project) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/projects">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">Project Not Found</h1>
                </div>
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        {error || "The requested project could not be found."}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/projects">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                        {project.description && (
                            <p className="text-muted-foreground">{project.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dashboard/monitors/new?projectId=${project.id}`}>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Monitor
                        </Button>
                    </Link>
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Monitors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{project._count.monitors}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {project.monitors.filter(m => m.isActive).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-muted-foreground">
                            {project.monitors.filter(m => !m.isActive).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monitors List */}
            <Card>
                <CardHeader>
                    <CardTitle>Monitors</CardTitle>
                    <CardDescription>All monitors in this project</CardDescription>
                </CardHeader>
                <CardContent>
                    {project.monitors.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No monitors yet</p>
                            <p className="text-sm mb-4">Add your first monitor to start tracking.</p>
                            <Link href={`/dashboard/monitors/new?projectId=${project.id}`}>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Monitor
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {project.monitors.map((monitor) => (
                                <Link
                                    key={monitor.id}
                                    href={`/dashboard/monitors/${monitor.id}`}
                                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${monitor.isActive ? 'bg-green-100 dark:bg-green-900/20' : 'bg-muted'
                                            }`}>
                                            {monitor.isActive ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{monitor.name}</p>
                                            <p className="text-sm text-muted-foreground truncate max-w-md">
                                                {monitor.url}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <Badge variant="outline">{monitor.method}</Badge>
                                        </div>
                                        <div className="text-right text-sm">
                                            <p className="font-medium">Every {monitor.frequency}s</p>
                                            <p className="text-xs text-muted-foreground">
                                                {monitor._count.monitorRuns} runs
                                            </p>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
