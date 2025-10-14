# Role-Based Authentication

This application implements role-based access control (RBAC) on top of Supabase authentication.

## User Roles

The system supports three user roles:

1. **Admin** - Full system access

   - Can access all features and pages
   - Dashboard: `/admin/dashboard`

2. **Manager** - Team management access

   - Can view every employee profile, remaining leave balance, salary, and latest performance snapshot
   - Can review and approve/reject leave requests (via secure Supabase RPCs)
   - Can view and mark attendance records for any employee
   - Dashboard: `/manager/dashboard`
   - Can also access admin routes

3. **Employee** - Basic user access
   - Can view personal information and request time off
   - Dashboard: `/employee/dashboard`

## How It Works

### User Registration

When a user signs up via the `/auth/sign-up` page:

1. User selects their role from a dropdown (Employee, Manager, or Admin)
2. Role is stored in Supabase user metadata during `signUp()`
3. User receives confirmation email (if email confirmation is enabled)

### Authentication Flow

1. User logs in via `/auth/login`
2. Middleware validates authentication on protected routes
3. User is redirected to `/protected`
4. Protected page checks user role and redirects to appropriate dashboard:
   - Admin → `/admin/dashboard`
   - Manager → `/manager/dashboard`
   - Employee → `/employee/dashboard`

### Route Protection

The middleware (`src/lib/middleware.ts`) enforces role-based access:

- `/admin/*` - Only accessible by users with `admin` role
- `/manager/*` - Accessible by `manager` and `admin` roles
- `/employee/*` - Accessible by any authenticated user with a role

If a user tries to access a route they don't have permission for, they are redirected to `/protected`.

## Implementation Details

### Key Files

- `src/lib/types.ts` - Role type definitions
- `src/lib/middleware.ts` - Role-based access control logic
- `src/components/sign-up-form.tsx` - Role selection during registration
- `src/app/protected/page.tsx` - Role-based redirect logic
- `src/app/admin/dashboard/page.tsx` - Admin dashboard
- `src/app/manager/dashboard/page.tsx` - Manager dashboard
- `src/app/employee/dashboard/page.tsx` - Employee dashboard
- `supabase/migrations/20251014120000_minimal_adjustments.sql` - Adds manager-friendly RLS policies, helper views, and approval RPCs

### Role Storage

User roles are stored in Supabase user metadata:

```typescript
user.user_metadata.role; // 'admin' | 'manager' | 'employee'
```

### Accessing User Role

In server components:

```typescript
const supabase = await createClient();
const { data } = await supabase.auth.getClaims();
const userRole = data?.claims.user_metadata?.role;
```

In middleware:

```typescript
const { data } = await supabase.auth.getClaims();
const userRole = data?.claims.user_metadata?.role;
```

### Supabase Policies & RPCs

- Core tables remain owner-scoped for employees (`select/insert/update` limited to the authenticated user's row via `user_id` joins).
- Managers and admins gain additional policies driven by the JWT `role` claim, allowing:
  - `select` on `employees`, `attendance_records`, `leave_requests`, `salary_records`, and `performance_evaluations` for organization-wide visibility.
  - `insert`/`update` on `attendance_records` so managers can mark attendance.
  - `update` on `leave_requests` (in practice routed through RPC calls below).
- Helper views (`latest_salary`, `latest_performance`) expose the most recent compensation and review data with grants to the `authenticated` role.
- Leave approvals flow through `approve_leave(p_leave_id, p_approver_employee_id)` and `reject_leave(...)` security-definer functions, ensuring balances update atomically and role checks happen server-side.

## Future Enhancements

- Add ability to change user roles (admin feature)
- Implement more granular permissions within roles
- Add role-based UI component visibility
- Create audit logs for role-based actions
