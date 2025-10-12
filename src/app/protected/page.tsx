import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/server'
import { UserRole } from '@/lib/types'

export default async function ProtectedPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const userRole = data.claims.user_metadata?.role as UserRole | undefined

  // Redirect to role-specific dashboard
  if (userRole === 'admin') {
    redirect('/admin/dashboard')
  } else if (userRole === 'manager') {
    redirect('/manager/dashboard')
  } else if (userRole === 'employee') {
    redirect('/employee/dashboard')
  }

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hello <span>{data.claims.email}</span>
        {userRole && <span className="ml-2 text-sm text-muted-foreground">({userRole})</span>}
      </p>
      <LogoutButton />
    </div>
  )
}
