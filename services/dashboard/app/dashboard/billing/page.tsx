import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Check, CreditCard, Zap } from "lucide-react"

const currentPlan = {
  name: "Pro",
  price: "$29",
  billingCycle: "monthly",
  nextBilling: "Jan 12, 2025",
  monitors: {
    used: 32,
    limit: 50,
  },
  teamMembers: {
    used: 3,
    limit: 5,
  },
}

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for personal projects",
    features: ["5 monitors", "5-minute intervals", "Email alerts", "7-day retention"],
    current: false,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For growing teams",
    features: ["50 monitors", "1-minute intervals", "Slack & email", "90-day retention", "SSL monitoring"],
    current: true,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    description: "For large organizations",
    features: ["Unlimited monitors", "30-second intervals", "All channels", "1-year retention", "Dedicated support"],
    current: false,
  },
]

const invoices = [
  { id: "INV-001", date: "Dec 12, 2024", amount: "$29.00", status: "Paid" },
  { id: "INV-002", date: "Nov 12, 2024", amount: "$29.00", status: "Paid" },
  { id: "INV-003", date: "Oct 12, 2024", amount: "$29.00", status: "Paid" },
  { id: "INV-004", date: "Sep 12, 2024", amount: "$29.00", status: "Paid" },
]

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details.</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge>{currentPlan.name}</Badge>
              </CardTitle>
              <CardDescription>Your subscription renews on {currentPlan.nextBilling}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{currentPlan.price}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Monitors</span>
              <span>
                {currentPlan.monitors.used} / {currentPlan.monitors.limit}
              </span>
            </div>
            <Progress value={(currentPlan.monitors.used / currentPlan.monitors.limit) * 100} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Team Members</span>
              <span>
                {currentPlan.teamMembers.used} / {currentPlan.teamMembers.limit}
              </span>
            </div>
            <Progress value={(currentPlan.teamMembers.used / currentPlan.teamMembers.limit) * 100} className="h-2" />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <CreditCard className="h-4 w-4" />
            Update Payment Method
          </Button>
          <Button variant="ghost">Cancel Subscription</Button>
        </CardFooter>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that best fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.current ? "border-primary" : "border-border"} ${plan.popular ? "shadow-lg shadow-primary/10" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1">
                      <Zap className="h-3 w-3" />
                      Popular
                    </Badge>
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
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant={plan.current ? "outline" : "default"} disabled={plan.current}>
                    {plan.current ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View and download past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{invoice.id}</p>
                    <p className="text-sm text-muted-foreground">{invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{invoice.amount}</span>
                  <Badge variant="secondary">{invoice.status}</Badge>
                  <Button variant="ghost" size="sm">
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
