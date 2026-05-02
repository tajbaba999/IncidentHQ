"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import Link from "next/link"

export function DashboardHeader() {
  const { setTheme, theme } = useTheme()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => {
        const unresolved = (d.alerts ?? []).filter((a: { resolved: boolean }) => !a.resolved).length
        setAlertCount(unresolved)
      })
      .catch(() => {})
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-1">
        <Link href="/dashboard/alerts">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
            <span className="sr-only">Alerts</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}
