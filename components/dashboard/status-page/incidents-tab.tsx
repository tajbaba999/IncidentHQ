"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Megaphone } from "lucide-react"

export function IncidentsTab() {
  return (
    <Card>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Incident management coming soon</p>
          <p className="text-sm">
            Report incidents, post staged updates and notify subscribers — arriving in the next update.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
