import { cache } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getStatusPageHistory } from "@/lib/status-page"
import { IncidentCard } from "@/components/status/incident-card"
import type { PublicIncident } from "@/lib/status-page"

export const revalidate = 300

const loadHistory = cache((slug: string) => getStatusPageHistory(slug))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const history = await loadHistory(slug)
    if (!history) return { title: "Incident History" }
    return { title: `${history.name} — Incident History` }
}

function groupByMonth(incidents: PublicIncident[]): Map<string, PublicIncident[]> {
    const byMonth = new Map<string, PublicIncident[]>()
    for (const incident of incidents) {
        const month = new Date(incident.startedAt).toLocaleString("en-US", {
            timeZone: "UTC",
            month: "long",
            year: "numeric",
        })
        const list = byMonth.get(month) ?? []
        list.push(incident)
        byMonth.set(month, list)
    }
    return byMonth
}

export default async function StatusHistoryPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const history = await loadHistory(slug)

    if (!history) notFound()

    const accent = history.brandColor || "#3b82f6"
    const byMonth = groupByMonth(history.incidents)

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
            <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

            <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {history.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={history.logoUrl}
                                alt={`${history.name} logo`}
                                className="h-10 w-10 rounded-lg object-contain"
                            />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900">{history.name}</h1>
                            <p className="text-sm text-zinc-500">Incident history — last 90 days</p>
                        </div>
                    </div>
                    <Link
                        href={`/status/${history.slug}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: accent }}
                    >
                        ← Current status
                    </Link>
                </header>

                <div className="mt-8 space-y-8">
                    {history.incidents.length === 0 ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
                            <p className="font-medium text-emerald-700">No incidents in the last 90 days</p>
                            <p className="mt-1 text-sm text-emerald-600">Smooth sailing.</p>
                        </div>
                    ) : (
                        Array.from(byMonth.entries()).map(([month, incidents]) => (
                            <section key={month} className="space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                                    {month}
                                </h2>
                                {incidents.map(incident => (
                                    <IncidentCard key={incident.id} incident={incident} />
                                ))}
                            </section>
                        ))
                    )}

                    <footer className="flex justify-end pt-2">
                        <a href="/" className="text-xs text-zinc-400 hover:text-zinc-600">
                            Powered by PulsePing
                        </a>
                    </footer>
                </div>
            </div>
        </div>
    )
}
