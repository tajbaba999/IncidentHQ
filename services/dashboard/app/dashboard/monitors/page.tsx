import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { MonitorsList } from "@/components/dashboard/monitors-list"

export default function MonitorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitors</h1>
          <p className="text-muted-foreground">Manage and view all your API monitors.</p>
        </div>
        <Link href="/dashboard/monitors/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Monitor
          </Button>
        </Link>
      </div>

      <MonitorsList showAll />
    </div>
  )
}
