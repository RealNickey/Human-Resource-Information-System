import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/server'
import { UserRole } from '@/lib/types'

export default async function EmployeeDashboard() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const userRole = data.claims.user_metadata?.role as UserRole | undefined

  // Ensure only employees (or any authenticated user) can access this page
  if (!userRole) {
    redirect('/protected')
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Employee Dashboard</h1>
          <LogoutButton />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="mb-4">
            Welcome, <span className="font-semibold">{data.claims.email}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Role: <span className="font-medium text-foreground">{userRole}</span>
          </p>
          <div className="mt-6">
            <h2 className="mb-3 text-xl font-semibold">Employee Features</h2>
            <ul className="list-inside list-disc space-y-2 text-sm">
              <li>View personal information</li>
              <li>Request time off</li>
              <li>View payslips</li>
              <li>Update profile</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
