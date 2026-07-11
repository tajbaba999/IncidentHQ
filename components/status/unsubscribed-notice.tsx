"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"


export function UnsubscribedNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('unsubscribed') === '1') {
      setVisible(true)
      params.delete('unsubscribed')
      const query = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''))
    }
  }, [])

  if (!visible) return null

  return (
    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <span>You&apos;ve been unsubscribed. You will no longer receive incident emails for this page.</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="ml-3 shrink-0 text-emerald-600 hover:text-emerald-800"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  )
}
