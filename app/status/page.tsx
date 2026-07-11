import Link from "next/link"
import { Activity } from "lucide-react"

export const metadata = {
    title: "Status Pages — PulsePing",
    description: "Public status pages hosted by PulsePing.",
}

// Landing target for the footer "Status Page" link — individual pages live at /status/[slug]
export default function StatusIndexPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center text-zinc-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500">
                <Activity className="h-7 w-7 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">PulsePing Status Pages</h1>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
                Every PulsePing project can publish a public status page at{" "}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">/status/your-page</code>{" "}
                with live component health, 90-day uptime and incident updates.
            </p>
            <Link
                href="/dashboard/status-page"
                className="mt-6 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
                Create your status page
            </Link>
        </div>
    )
}
