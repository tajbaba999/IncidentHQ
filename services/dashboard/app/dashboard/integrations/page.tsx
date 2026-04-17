import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, CheckCircle2 } from "lucide-react"

export default function IntegrationsPage() {
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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send email alerts when monitor status changes</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Notification Email</Label>
            <Input id="email" type="email" placeholder="alerts@example.com" />
            <p className="text-xs text-muted-foreground">
              Email address where alerts will be sent. You can add additional emails in monitor settings.
            </p>
          </div>

          <div className="space-y-4">
            <Label>Notification Types</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Monitor Down</p>
                  <p className="text-xs text-muted-foreground">Alert when a monitor fails</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Monitor Recovered</p>
                  <p className="text-xs text-muted-foreground">Alert when a monitor recovers</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Daily Summary</p>
                  <p className="text-xs text-muted-foreground">Daily report of all monitor activity</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          <Button className="w-full sm:w-auto">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
