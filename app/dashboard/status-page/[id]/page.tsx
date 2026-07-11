"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react"
import { SettingsTab } from "@/components/dashboard/status-page/settings-tab"
import { ComponentsTab } from "@/components/dashboard/status-page/components-tab"
import { IncidentsTab } from "@/components/dashboard/status-page/incidents-tab"
import type { StatusPageConfig } from "@/components/dashboard/status-page/types"

export default function StatusPageDetailPage() {
    const params = useParams<{ id: string }>()
    const [statusPage, setStatusPage] = useState<StatusPageConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refetch = useCallback(async () => {
        try {
            const response = await fetch(`/api/status-page/${params.id}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch status page')
            }

            setStatusPage(data.statusPage)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [params.id])

    useEffect(() => {
        refetch()
    }, [refetch])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !statusPage) {
        return (
            <div className="space-y-4">
                <Link href="/dashboard/status-page">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Status Pages
                    </Button>
                </Link>
                <div className="text-center py-8 text-destructive">
                    <p>{error || 'Status page not found'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/dashboard/status-page">
                    <Button variant="ghost" size="sm" className="gap-2 mb-2 -ml-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Status Pages
                    </Button>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{statusPage.name}</h1>
                        <Badge variant={statusPage.isPublished ? "default" : "secondary"}>
                            {statusPage.isPublished ? "Published" : "Draft"}
                        </Badge>
                    </div>
                    <a href={`/status/${statusPage.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            View public page
                        </Button>
                    </a>
                </div>
                <p className="text-muted-foreground mt-1">
                    {statusPage.project.name} • /status/{statusPage.slug}
                </p>
            </div>

            <Tabs defaultValue="components">
                <TabsList>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="incidents">Incidents</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="components" className="mt-4">
                    <ComponentsTab statusPage={statusPage} onChanged={refetch} />
                </TabsContent>
                <TabsContent value="incidents" className="mt-4">
                    <IncidentsTab statusPage={statusPage} />
                </TabsContent>
                <TabsContent value="settings" className="mt-4">
                    <SettingsTab statusPage={statusPage} onChanged={refetch} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
