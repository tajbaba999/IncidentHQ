"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]

const FREQUENCY_PRESETS = [
  { label: "10 seconds", value: 10 },
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "5 minutes", value: 300 },
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "1 hour", value: 3600 },
]

export default function EditMonitorPage() {
  const params = useParams()
  const router = useRouter()
  const monitorId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    url: "",
    method: "GET",
    expectedStatus: 200,
    frequency: 60,
    alertEmail: "",
    description: "",
  })

  useEffect(() => {
    fetch(`/api/monitor/${monitorId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.monitor) throw new Error("Monitor not found")
        const m = d.monitor
        setForm({
          name: m.name ?? "",
          url: m.url ?? "",
          method: m.method ?? "GET",
          expectedStatus: m.expectedStatus ?? 200,
          frequency: m.frequency ?? 60,
          alertEmail: m.alertEmail ?? "",
          description: m.description ?? "",
        })
      })
      .catch(() => toast.error("Failed to load monitor"))
      .finally(() => setLoading(false))
  }, [monitorId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/monitor/${monitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to update monitor")
      }
      toast.success("Monitor updated successfully")
      router.push(`/dashboard/monitors/${monitorId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update monitor")
    } finally {
      setSaving(false)
    }
  }

  const set = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/monitors/${monitorId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Monitor</h1>
          <p className="text-muted-foreground">Update your monitor configuration.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Monitor Details</CardTitle>
            <CardDescription>Update the configuration for this monitor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Monitor Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Endpoint URL *</Label>
              <Input
                id="url"
                type="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>HTTP Method</Label>
                <Select value={form.method} onValueChange={(v) => set("method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedStatus">Expected Status Code</Label>
                <Input
                  id="expectedStatus"
                  type="number"
                  min={100}
                  max={599}
                  value={form.expectedStatus}
                  onChange={(e) => set("expectedStatus", parseInt(e.target.value) || 200)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Check Frequency</Label>
              <Select
                value={String(form.frequency)}
                onValueChange={(v) => set("frequency", parseInt(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>Every {p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertEmail">Alert Email</Label>
              <Input
                id="alertEmail"
                type="email"
                placeholder="alerts@example.com"
                value={form.alertEmail}
                onChange={(e) => set("alertEmail", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional notes about this monitor..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Link href={`/dashboard/monitors/${monitorId}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
