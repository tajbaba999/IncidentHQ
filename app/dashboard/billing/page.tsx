"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Check, CreditCard, Zap, Loader2 } from "lucide-react"

const PLAN_LIMITS: Record<string, { monitors: number; interval: string; price: string }> = {
  FREE: { monitors: 3, interval: "60s", price: "$0" },
  PRO: { monitors: 50, interval: "1 min", price: "$29" },
  TEAM: { monitors: 200, interval: "30s", price: "$79" },
  ENTERPRISE: { monitors: 9999, interval: "10s", price: "$199" },
}

const plans = [
  {
    name: "FREE", price: "$0",
    description: "Perfect for personal projects",
    features: ["3 monitors", "60-second intervals", "Email alerts", "7-day retention"],
  },
  {
    name: "PRO", price: "$29",
    description: "For growing teams",
    features: ["50 monitors", "1-minute intervals", "Slack & email", "90-day retention", "SSL monitoring"],
    popular: true,
  },
  {
    name: "ENTERPRISE", price: "$199",
    description: "For large organizations",
    features: ["Unlimited monitors", "10-second intervals", "All channels", "1-year retention", "Dedicated support"],
  },
]

interface BillingData {
  plan: string
  status: string
  monitorsUsed: number
  monitorsLimit: number
  intervalSeconds: number
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const planInfo = data ? PLAN_LIMITS[data.plan] ?? PLAN_LIMITS.FREE : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Badge>{data?.plan ?? "FREE"}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {data?.status === "active" ? "Your subscription is active" : "Manage your subscription below"}
              </CardDescription>
            </div>
            {planInfo && (
              <div className="text-right">
                <p className="text-2xl font-bold">{planInfo.price}</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
            )}
          </div>
        </CardHeader>
        {data && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Monitors</span>
                <span>{data.monitorsUsed} / {data.monitorsLimit === 9999 ? "∞" : data.monitorsLimit}</span>
              </div>
              <Progress
                value={data.monitorsLimit === 9999 ? 0 : (data.monitorsUsed / data.monitorsLimit) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        )}
        <CardFooter className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" disabled>
            <CreditCard className="h-4 w-4" />
            Update Payment Method
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that best fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = data?.plan === plan.name
              return (
                <Card
                  key={plan.name}
                  className={`relative ${isCurrent ? "border-primary" : "border-border"} ${plan.popular ? "shadow-lg shadow-primary/10" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1"><Zap className="h-3 w-3" />Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div>
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant={isCurrent ? "outline" : "default"} disabled={isCurrent}>
                      {isCurrent ? "Current Plan" : "Upgrade"}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
