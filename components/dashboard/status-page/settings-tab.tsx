"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { Loader2, Trash2 } from "lucide-react"
import type { StatusPageConfig } from "./types"

interface SettingsTabProps {
  statusPage: StatusPageConfig
  onChanged: () => Promise<void>
}

export function SettingsTab({ statusPage, onChanged }: SettingsTabProps) {
  const router = useRouter()

  const [name, setName] = useState(statusPage.name)
  const [slug, setSlug] = useState(statusPage.slug)
  const [description, setDescription] = useState(statusPage.description || "")
  const [logoUrl, setLogoUrl] = useState(statusPage.logoUrl || "")
  const [brandColor, setBrandColor] = useState(statusPage.brandColor || "#3b82f6")

  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const patchPage = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/status-page/${statusPage.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update status page')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      await patchPage({
        name,
        slug,
        description: description || null,
        logoUrl: logoUrl || null,
        brandColor: brandColor || null,
      })
      await onChanged()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToggle = async (checked: boolean) => {
    setPublishing(true)
    setError(null)
    try {
      await patchPage({ isPublished: checked })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publish state')
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/status-page/${statusPage.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete status page')
      }
      router.push('/dashboard/status-page')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete status page')
      setDeleting(false)
    }
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
          <CardTitle>Visibility</CardTitle>
          <CardDescription>
            Only published pages are reachable at /status/{statusPage.slug}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Publish status page</p>
              <p className="text-sm text-muted-foreground">
                Make this page publicly accessible without login
              </p>
            </div>
            <div className="flex items-center gap-2">
              {publishing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={statusPage.isPublished}
                onCheckedChange={handlePublishToggle}
                disabled={publishing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Page Settings</CardTitle>
            <CardDescription>Name, URL and branding of your public status page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="page-name">Page Name *</Label>
              <Input
                id="page-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-slug">URL Slug *</Label>
              <Input
                id="page-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                required
              />
              <p className="text-xs text-muted-foreground">
                3-50 characters, lowercase letters, numbers and hyphens. Changing this breaks existing links.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-description">Description</Label>
              <Textarea
                id="page-description"
                placeholder="Live status for our services..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-logo">Logo URL</Label>
              <Input
                id="page-logo"
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-color">Brand Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="page-color"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-1"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-32"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving || !name || slug.length < 3}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              {saved && <span className="text-sm text-muted-foreground">Saved ✓</span>}
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Deleting a status page removes its groups, components, incidents and subscribers. Monitors are not affected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Status Page
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this status page?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes &quot;{statusPage.name}&quot; including all groups, components,
                  incident history and subscribers. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
