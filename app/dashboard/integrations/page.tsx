"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface EmailConfig {
  email: string
  notifyDown: boolean
  notifyRecovery: boolean
  dailySummary: boolean
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<EmailConfig>({
    email: "",
    notifyDown: true,
    notifyRecovery: true,
    dailySummary: false,
  })

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((d) => {
        const emailInt = (d.integrations ?? []).find((i: { type: string }) => i.type === "RESEND_EMAIL")
        if (emailInt?.config) setConfig(emailInt.config as EmailConfig)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "RESEND_EMAIL", config }),
      })
      if (!res.ok) throw new Error()
      toast.success("Email notification settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Notifications</h1>
        <p className="text-muted-foreground">Configure email alerts for your monitors.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Email Alerts</CardTitle>
              <CardDescription>Receive email notifications when monitors go down or recover</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Notification Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="alerts@example.com"
                  value={config.email}
                  onChange={(e) => setConfig((c) => ({ ...c, email: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Email address where alerts will be sent.
                </p>
              </div>

              <div className="space-y-4">
                <Label>Notification Types</Label>
                <div className="space-y-3">
                  {[
                    { key: "notifyDown", label: "Monitor Down", desc: "Alert when a monitor fails" },
                    { key: "notifyRecovery", label: "Monitor Recovered", desc: "Alert when a monitor recovers" },
                    { key: "dailySummary", label: "Daily Summary", desc: "Daily report of all monitor activity" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={config[key as keyof EmailConfig] as boolean}
                        onCheckedChange={(v) => setConfig((c) => ({ ...c, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
