"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Activity,
  LayoutDashboard,
  Monitor,
  Bell,
  Mail,
  Settings,
  FileText,
  LogOut,
  ChevronLeft,
  Menu,
  FolderKanban,
  CreditCard,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useUser, useClerk } from "@clerk/nextjs"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Monitors", href: "/dashboard/monitors", icon: Monitor },
  { name: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { name: "Status Page", href: "/dashboard/status-page", icon: Globe },
  { name: "Postmortems", href: "/dashboard/postmortems", icon: FileText },
  { name: "Integrations", href: "/dashboard/integrations", icon: Mail },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useUser()
  const { signOut } = useClerk()

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "U"
    const firstName = user.firstName || ""
    const lastName = user.lastName || ""
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) return firstName.substring(0, 2).toUpperCase()
    if (user.primaryEmailAddress) {
      return user.primaryEmailAddress.emailAddress.substring(0, 2).toUpperCase()
    }
    return "U"
  }

  // Get display name
  const getDisplayName = () => {
    if (!user) return "Loading..."
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim()
    }
    return user.primaryEmailAddress?.emailAddress || "User"
  }

  // Get email
  const getEmail = () => {
    return user?.primaryEmailAddress?.emailAddress || "No email"
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">PulsePing</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-sm font-semibold">{getInitials()}</span>
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{getDisplayName()}</p>
              <p className="truncate text-xs text-muted-foreground">{getEmail()}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  )
}
