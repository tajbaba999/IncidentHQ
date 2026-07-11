export type DeployMode = 'saas' | 'selfhost'

/**
 * How this instance is deployed:
 * - `saas`     — Vercel + Neon; health checks run via the Vercel Cron sweep
 * - `selfhost` — long-lived Docker process + standard Postgres; health checks
 *                run on the in-process scheduler
 */
export function getDeployMode(): DeployMode {
    return process.env.DEPLOY_MODE === 'selfhost' ? 'selfhost' : 'saas'
}

export function isSelfHosted(): boolean {
    return getDeployMode() === 'selfhost'
}

/**
 * The in-process scheduler only works in a long-lived server process.
 * On Vercel serverless its intervals die with the invocation, and during
 * `next build` starting it just spams DB connection errors.
 * Local `next dev` keeps it in both modes so monitors run while developing.
 */
export function schedulerEnabled(): boolean {
    if (process.env.NEXT_PHASE === 'phase-production-build') return false
    return isSelfHosted() || process.env.NODE_ENV === 'development'
}
