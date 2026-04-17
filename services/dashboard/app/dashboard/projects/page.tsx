"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderKanban, Plus, Monitor, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Project {
    id: string
    name: string
    description: string | null
    createdAt: string
    _count: {
        monitors: number
    }
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchProjects() {
            try {
                const response = await fetch('/api/project')
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch projects')
                }

                setProjects(data.projects || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }

        fetchProjects()
    }, [])

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
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground">Organize your monitors into projects.</p>
                </div>
                <Link href="/dashboard/projects/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Project
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{projects.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Monitors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {projects.reduce((acc, p) => acc + p._count.monitors, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monitors/Project</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {projects.length > 0
                                ? (projects.reduce((acc, p) => acc + p._count.monitors, 0) / projects.length).toFixed(1)
                                : '0'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Projects</CardTitle>
                    <CardDescription>Click on a project to view its monitors</CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-center py-8 text-destructive">
                            <p>{error}</p>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No projects yet</p>
                            <p className="text-sm">Create your first project to organize your monitors.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/dashboard/projects/${project.id}`}
                                    className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <FolderKanban className="h-5 w-5 text-primary" />
                                        </div>
                                        <Badge variant="secondary" className="gap-1">
                                            <Monitor className="h-3 w-3" />
                                            {project._count.monitors}
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold truncate">{project.name}</h3>
                                    {project.description && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {project.description}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-3">
                                        Created {new Date(project.createdAt).toLocaleDateString()}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
