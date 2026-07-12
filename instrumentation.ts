/**
 * Runs once when the Next.js server boots. Without this the monitor
 * scheduler (self-host mode) only starts after the first page request,
 * because lib/init.ts is otherwise reached via app/layout.tsx.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('@/lib/init')
    }
}
