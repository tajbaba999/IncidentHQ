"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Plus, Loader2, Layers, Users } from "lucide-react"

interface StatusPageListItem {
    id: string
    slug: string
    name: string
    isPublished: boolean
    createdAt: string
    project: { id: string; name: string }
    _count: { groups: number; incidents: number; subscribers: number }
}

interface Project {
    id: string
    name: string
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50)
}

export default function StatusPagesPage() {
    const router = useRouter()
    const [statusPages, setStatusPages] = useState<StatusPageListItem[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Create form state
    const [showCreate, setShowCreate] = useState(false)
    const [projectId, setProjectId] = useState("")
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [slugEdited, setSlugEdited] = useState(false)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const [pagesRes, projectsRes] = await Promise.all([
                    fetch('/api/status-page'),
                    fetch('/api/project'),
                ])
                const pagesData = await pagesRes.json()
                const projectsData = await projectsRes.json()

                if (!pagesRes.ok) {
                    throw new Error(pagesData.error || 'Failed to fetch status pages')
                }

                setStatusPages(pagesData.statusPages || [])
                setProjects(projectsData.projects || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    // Only projects without a status page can get a new one (1:1 relation)
    const availableProjects = projects.filter(
        project => !statusPages.some(page => page.project.id === project.id)
    )

    const handleNameChange = (value: string) => {
        setName(value)
        if (!slugEdited) setSlug(slugify(value))
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        setCreateError(null)

        try {
            const response = await fetch('/api/status-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, name, slug })
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create status page')
            }

            router.push(`/dashboard/status-page/${data.statusPage.id}`)
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create status page')
            setCreating(false)
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Status Pages</h1>
                    <p className="text-muted-foreground">Public status pages for your projects.</p>
                </div>
                <Button className="gap-2" onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="h-4 w-4" />
                    New Status Page
                </Button>
            </div>

            {showCreate && (
                <form onSubmit={handleCreate}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Status Page</CardTitle>
                            <CardDescription>
                                Each project can have one public status page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {createError && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
                                    {createError}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="project">Project *</Label>
                                <Select value={projectId} onValueChange={setProjectId} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            availableProjects.length === 0
                                                ? "All projects already have a status page"
                                                : "Select a project"
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableProjects.map(project => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Page Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Acme Status"
                                    value={name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">URL Slug *</Label>
                                <Input
                                    id="slug"
                                    placeholder="acme-status"
                                    value={slug}
                                    onChange={(e) => {
                                        setSlugEdited(true)
                                        setSlug(slugify(e.target.value))
                                    }}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Your page will be public at /status/{slug || 'your-slug'}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={creating || !projectId || !name || slug.length < 3}
                                >
                                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Status Page
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>All Status Pages</CardTitle>
                    <CardDescription>Click on a page to configure components and incidents</CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-center py-8 text-destructive">
                            <p>{error}</p>
                        </div>
                    ) : statusPages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No status pages yet</p>
                            <p className="text-sm">Create a public status page for one of your projects.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {statusPages.map((page) => (
                                <Link
                                    key={page.id}
                                    href={`/dashboard/status-page/${page.id}`}
                                    className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <Globe className="h-5 w-5 text-primary" />
                                        </div>
                                        <Badge variant={page.isPublished ? "default" : "secondary"}>
                                            {page.isPublished ? "Published" : "Draft"}
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold truncate">{page.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1 truncate">
                                        {page.project.name} • /status/{page.slug}
                                    </p>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Layers className="h-3 w-3" />
                                            {page._count.groups} groups
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {page._count.subscribers} subscribers
                                        </span>
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
