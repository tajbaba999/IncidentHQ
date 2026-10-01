"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"


export function UnsubscribedNotice({ slug }: { slug: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [state, setState] = useState<'confirm' | 'loading' | 'done' | 'error' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('unsubscribe')
    if (t) {
      setToken(t)
      setState('confirm')
      params.delete('unsubscribe')
      const query = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''))
    }
  }, [])

  const confirm = async () => {
    setState('loading')
    try {
      const res = await fetch(`/api/status/${slug}/unsubscribe?token=${encodeURIComponent(token!)}`, { method: 'POST' })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (!state) return null

  if (state === 'confirm' || state === 'loading') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
        <span>Stop receiving incident emails for this page?</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setState(null)}
            className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={state === 'loading'}
            className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {state === 'loading' ? 'Unsubscribing…' : 'Unsubscribe'}
          </button>
        </div>
      </div>
    )
  }

  const ok = state === 'done'
  return (
    <div className={ok
      ? "flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      : "flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"}>
      <span>
        {ok
          ? "You've been unsubscribed. You will no longer receive incident emails for this page."
          : "Couldn't unsubscribe right now. Please try the link again later."}
      </span>
      <button
        type="button"
        onClick={() => setState(null)}
        className="ml-3 shrink-0 opacity-80 hover:opacity-100"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  )
}
