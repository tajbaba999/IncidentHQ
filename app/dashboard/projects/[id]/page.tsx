"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft, Loader2, Monitor, Plus, Trash2,
  CheckCircle2, XCircle, ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface MonitorData {
  id: string
  name: string
  url: string
  method: string
  expectedStatus: number
  frequency: number
  isActive: boolean
  createdAt: string
  _count: { monitorRuns: number }
}

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  monitors: MonitorData[]
  _count: { monitors: number }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/project/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.project) throw new Error(d.error || "Failed to fetch project")
        setProject(d.project)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!project) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/project/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to delete project")
      }
      toast.success(`Project "${project.name}" deleted`)
      router.push("/dashboard/projects")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project")
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
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/monitors/new?projectId=${project.id}`}>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Monitor</Button>
          </Link>
          <Button variant="destructive" size="icon" onClick={() => setDeleteOpen(true)} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Monitors", value: project._count.monitors },
          { label: "Active", value: project.monitors.filter((m) => m.isActive).length, className: "text-green-600" },
          { label: "Paused", value: project.monitors.filter((m) => !m.isActive).length, className: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.className ?? ""}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                <Button className="gap-2"><Plus className="h-4 w-4" />Add Monitor</Button>
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
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${monitor.isActive ? "bg-green-100 dark:bg-green-900/20" : "bg-muted"}`}>
                      {monitor.isActive
                        ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                        : <XCircle className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium">{monitor.name}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-md">{monitor.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{monitor.method}</Badge>
                    <div className="text-right text-sm">
                      <p className="font-medium">Every {monitor.frequency}s</p>
                      <p className="text-xs text-muted-foreground">{monitor._count.monitorRuns} runs</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{project.name}</strong> and all {project._count.monitors} monitor{project._count.monitors !== 1 ? "s" : ""} inside it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
