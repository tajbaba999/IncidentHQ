import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/register(.*)',
    '/sso-callback(.*)',
    '/api/webhooks(.*)',
    '/api/test(.*)',  // Development test endpoints
    '/api/cron(.*)',  // Cron job endpoints for health checks
    '/api/health(.*)', // Health check endpoints
    '/status(.*)',     // Public status pages
    '/api/status/(.*)', // Public status page APIs (subscribe/unsubscribe)
])

export default clerkMiddleware(async (auth, req) => {
    // Allow test mode bypass in development
    const isTestMode = req.headers.get('x-test-auth') === 'true' && process.env.NODE_ENV !== 'production'

    if (!isPublicRoute(req) && !isTestMode) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
        '/api/:path*'
    ],
}