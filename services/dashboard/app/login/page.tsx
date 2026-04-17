import { LoginForm } from "@/components/auth/login-form"
import { Activity } from "lucide-react"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  // Check if user is already logged in
  const { userId } = await auth()

  if (userId) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 lg:w-1/2 lg:px-8">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">PulsePing</span>
          </Link>

          <h1 className="mb-2 text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mb-8 text-muted-foreground">Sign in to your account to continue</p>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden bg-muted/30 lg:flex lg:w-1/2 lg:items-center lg:justify-center lg:border-l lg:border-border/40">
        <div className="max-w-md px-8 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-4 text-2xl font-bold">Monitor with confidence</h2>
          <p className="text-muted-foreground">
            Join thousands of teams who trust PulsePing to keep their APIs running smoothly. Get real-time alerts and
            comprehensive analytics.
          </p>
        </div>
      </div>
    </div>
  )
}
