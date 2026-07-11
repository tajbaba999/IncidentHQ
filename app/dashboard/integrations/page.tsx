"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, CheckCircle2, Loader2, Hash, Send } from "lucide-react"
import { toast } from "sonner"

interface EmailConfig {
  email: string
  notifyDown: boolean
  notifyRecovery: boolean
  dailySummary: boolean
}

interface SlackConfig {
  webhookUrl: string
  notifyIncidents: boolean
  notifyMonitorDown: boolean
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

  const [slackSaving, setSlackSaving] = useState(false)
  const [slackTesting, setSlackTesting] = useState(false)
  const [slackConfig, setSlackConfig] = useState<SlackConfig>({
    webhookUrl: "",
    notifyIncidents: true,
    notifyMonitorDown: true,
  })

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((d) => {
        const integrations = d.integrations ?? []
        const emailInt = integrations.find((i: { type: string }) => i.type === "RESEND_EMAIL")
        if (emailInt?.config) setConfig(emailInt.config as EmailConfig)
        const slackInt = integrations.find((i: { type: string }) => i.type === "SLACK")
        if (slackInt?.config) {
          setSlackConfig((c) => ({ ...c, ...(slackInt.config as Partial<SlackConfig>) }))
        }
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

  const slackUrlValid = slackConfig.webhookUrl.startsWith("https://hooks.slack.com/")

  const handleSlackSave = async () => {
    if (!slackUrlValid) {
      toast.error("Webhook URL must start with https://hooks.slack.com/")
      return
    }
    setSlackSaving(true)
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SLACK", config: slackConfig }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Slack settings saved")
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to save Slack settings")
    } finally {
      setSlackSaving(false)
    }
  }

  const handleSlackTest = async () => {
    if (!slackUrlValid) {
      toast.error("Enter a webhook URL starting with https://hooks.slack.com/ first")
      return
    }
    setSlackTesting(true)
    try {
      const res = await fetch("/api/integrations/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: slackConfig.webhookUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Test message sent — check your Slack channel")
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to send test message")
    } finally {
      setSlackTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Get email and Slack alerts for monitors and status-page incidents.
        </p>
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Slack</CardTitle>
              <CardDescription>
                Post incident updates and monitor-down alerts to a Slack channel via an incoming webhook
              </CardDescription>
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
                <Label htmlFor="slack-webhook">Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  type="url"
                  placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                  value={slackConfig.webhookUrl}
                  onChange={(e) => setSlackConfig((c) => ({ ...c, webhookUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Create one in Slack under Apps → Incoming Webhooks, then paste it here.
                </p>
              </div>

              <div className="space-y-4">
                <Label>Notification Types</Label>
                <div className="space-y-3">
                  {[
                    { key: "notifyIncidents", label: "Status Page Incidents", desc: "Post when incidents are reported or updated" },
                    { key: "notifyMonitorDown", label: "Monitor Down", desc: "Post when a monitor health check fails" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={slackConfig[key as "notifyIncidents" | "notifyMonitorDown"]}
                        onCheckedChange={(v) => setSlackConfig((c) => ({ ...c, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSlackSave} disabled={slackSaving || !slackConfig.webhookUrl}>
                  {slackSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSlackTest}
                  disabled={slackTesting || !slackConfig.webhookUrl}
                >
                  {slackTesting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send test message
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
