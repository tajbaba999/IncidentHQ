import { cache } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getPublicStatusPage } from "@/lib/status-page"
import { ExpandableGroup } from "@/components/status/expandable-group"
import { IncidentCard } from "@/components/status/incident-card"
import { SubscribeDialog } from "@/components/status/subscribe-dialog"
import { UnsubscribedNotice } from "@/components/status/unsubscribed-notice"
import { cn } from "@/lib/utils"
import { COMPONENT_STATUS_META, PAGE_STATUS_HEADLINE } from "@/components/status/status-meta"

export const revalidate = 60

const loadPage = cache((slug: string) => getPublicStatusPage(slug))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const page = await loadPage(slug)
    if (!page) return { title: "Status" }
    return {
        title: `${page.name} — Status`,
        description: page.description || `Live status and uptime for ${page.name}`,
    }
}

export default async function PublicStatusPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const page = await loadPage(slug)

    if (!page) notFound()

    const accent = page.brandColor || "#3b82f6"
    const overallMeta = COMPONENT_STATUS_META[page.overallStatus]
    const hasActiveIncidents = page.activeIncidents.length > 0

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
            {/* Brand accent bar */}
            <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

            <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
                {/* Header */}
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {page.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={page.logoUrl}
                                alt={`${page.name} logo`}
                                className="h-10 w-10 rounded-lg object-contain"
                            />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900">{page.name}</h1>
                            {page.description && (
                                <p className="text-sm text-zinc-500">{page.description}</p>
                            )}
                        </div>
                    </div>
                    <SubscribeDialog slug={page.slug} pageName={page.name} brandColor={page.brandColor} />
                </header>

                <div className="mt-6 space-y-6">
                    <UnsubscribedNotice />

                    {/* Overall status hero */}
                    <div
                        className={cn(
                            "flex items-center gap-3 rounded-lg border p-4 sm:p-5",
                            hasActiveIncidents || page.overallStatus !== "OPERATIONAL"
                                ? "border-zinc-200 bg-white"
                                : "border-emerald-200 bg-emerald-50",
                        )}
                    >
                        <span className={cn("h-3.5 w-3.5 rounded-full", overallMeta.dot)} />
                        <h2 className="text-lg font-semibold text-zinc-900">
                            {PAGE_STATUS_HEADLINE[page.overallStatus]}
                        </h2>
                    </div>

                    {/* Active incidents */}
                    {hasActiveIncidents && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                                Active incidents
                            </h2>
                            {page.activeIncidents.map(incident => (
                                <IncidentCard key={incident.id} incident={incident} />
                            ))}
                        </section>
                    )}

                    {/* System status */}
                    <section>
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                            System status
                        </h2>
                        <div className="rounded-lg border border-zinc-200 bg-white">
                            {page.groups.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-6">
                                    No components are being tracked on this page yet.
                                </p>
                            ) : (
                                page.groups.map(group => (
                                    <ExpandableGroup key={group.id} group={group} />
                                ))
                            )}
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <Link
                            href={`/status/${page.slug}/history`}
                            className="text-sm font-medium hover:underline"
                            style={{ color: accent }}
                        >
                            View incident history →
                        </Link>
                        <a
                            href="/"
                            className="text-xs text-zinc-400 hover:text-zinc-600"
                        >
                            Powered by PulsePing
                        </a>
                    </footer>
                </div>
            </div>
        </div>
    )
}
