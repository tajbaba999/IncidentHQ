import { Suspense } from "react"
import { CreateMonitorForm } from "@/components/dashboard/create-monitor-form"

function FormSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 w-full bg-muted rounded-md mb-4"></div>
      <div className="h-10 w-full bg-muted rounded-md mb-4"></div>
      <div className="h-10 w-full bg-muted rounded-md mb-4"></div>
      <div className="h-10 w-32 bg-muted rounded-md"></div>
    </div>
  )
}

export default function NewMonitorPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Monitor</h1>
        <p className="text-muted-foreground">Set up a new API endpoint to monitor.</p>
      </div>

      <Suspense fallback={<FormSkeleton />}>
        <CreateMonitorForm />
      </Suspense>
    </div>
  )
}
