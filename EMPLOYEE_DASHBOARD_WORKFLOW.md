# Employee Dashboard Workflow

## Overview

This document describes the complete employee dashboard workflow, from first-time login through daily dashboard usage. The workflow ensures a smooth onboarding experience and provides employees with comprehensive access to their HR information.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Logs In                             │
│                    (via /auth/login)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Middleware Checks Authentication                    │
│                  (src/middleware.ts)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
         Not Authenticated      Authenticated
                │                       │
                ▼                       ▼
    ┌─────────────────────┐   ┌──────────────────────┐
    │  Redirect to Login  │   │  Check Employee Role │
    └─────────────────────┘   └──────────┬───────────┘
                                          │
                              ┌───────────┴────────────┐
                              │                        │
                        Manager Role            Employee Role
                              │                        │
                              ▼                        ▼
                   ┌──────────────────┐    ┌─────────────────────┐
                   │ Manager Dashboard│    │ Employee Dashboard  │
                   └──────────────────┘    │ (/employee/dashboard)│
                                           └──────────┬──────────┘
                                                      │
                                          ┌───────────┴───────────┐
                                          │                       │
                                  Profile Exists         Profile Missing
                                          │                       │
                                          ▼                       ▼
                           ┌──────────────────────┐  ┌───────────────────────┐
                           │  Show Full Dashboard │  │ Show Profile Setup    │
                           │  with All Features   │  │ Form (Onboarding)     │
                           └──────────────────────┘  └───────────┬───────────┘
                                                                  │
                                                                  ▼
                                                      ┌───────────────────────┐
                                                      │ User Fills Personal   │
                                                      │ Information Form      │
                                                      └───────────┬───────────┘
                                                                  │
                                                                  ▼
                                                      ┌───────────────────────┐
                                                      │ Profile Created in DB │
                                                      │ (action redirects)    │
                                                      └───────────┬───────────┘
                                                                  │
                                                                  ▼
                                                      ┌───────────────────────┐
                                                      │ Page Reloads &        │
                                                      │ Shows Full Dashboard  │
                                                      └───────────────────────┘
```

## Detailed Workflow Steps

### 1. Authentication & Authorization

**File**: `src/middleware.ts`

- User must be authenticated to access `/employee/dashboard`
- System checks user's role from JWT claims (`user_metadata.role`)
- Only users with `employee` role can access employee dashboard
- Managers are redirected to `/manager/dashboard`

### 2. Profile Check

**File**: `src/app/employee/dashboard/page.tsx`

```typescript
// Query database for employee record
const { data: employeeData } = await supabase
  .from("employees")
  .select("...")
  .eq("user_id", data.claims.sub)
  .maybeSingle();
```

**Logic**:
- If `employeeData` exists → Show full dashboard
- If `employeeData` is null → Show profile setup form

### 3. First-Time User Flow (Profile Setup)

**Component**: `src/components/employee-profile-setup-form.tsx`

**Process**:
1. User sees profile setup form with fields:
   - First Name (required)
   - Last Name (required)
   - Date of Birth (optional)
   - Date of Joining (required, defaults to today)
   - Department (dropdown)
   - Phone Number (optional)
   - Address (optional)
   - Emergency Contact Name (optional)
   - Emergency Contact Phone (optional)

2. Form submission triggers server action:
   - **Action**: `createEmployeeProfile` in `src/app/employee/dashboard/actions.ts`
   - Validates all fields using Zod schema
   - Generates unique employee ID automatically
   - Creates employee record in database
   - **Automatic redirect** to `/employee/dashboard` on success

3. Page reloads after redirect:
   - Profile now exists in database
   - Full dashboard is rendered

**Access Restriction**: Until profile is created, user CANNOT see dashboard features. They remain on the profile setup screen.

### 4. Main Employee Dashboard Features

**Location**: `src/app/employee/dashboard/page.tsx`

Once profile exists, user sees these sections:

#### A. Dashboard Summary Card
**Component**: `src/components/employee-dashboard-summary.tsx`

Displays:
- Days worked this month
- Leave days taken this year
- Leaves remaining
- Next payday

#### B. Personal Information Section
**Component**: `src/components/employee-personal-info.tsx`

Shows:
- Employee avatar with initials
- Employee ID (auto-generated)
- Full name
- Department
- Email
- Date of birth
- Date of joining

All personal details saved during onboarding.

#### C. Attendance Tracker
**Component**: `src/components/attendance-summary.tsx`

Features:
- Monthly view with navigation (previous/next month)
- Metrics cards:
  - Days present
  - Days absent
  - Leave days
  - Hours logged
- Weekly presence trend chart (line chart showing 8 weeks)
- Detailed attendance table with:
  - Date
  - Status (present, absent, partial, holiday, sick)
  - Total hours

**Data Source**: `attendance_records` table filtered by employee ID

#### D. Leave Management
**Component**: `src/components/leave-management.tsx`

Two main sections:

**Leave History Table**:
- Shows all leave requests for current year
- Columns: Start Date, End Date, Type, Days, Status
- Status badges: Pending (amber), Approved (green), Rejected (red)
- Displays approved leaves that were already taken
- Summary stats:
  - Approved days this year
  - Pending requests
  - Remaining leave balance
  - Next scheduled leave

**Request Time Off Form**:
- Leave Type dropdown (vacation, sick, personal, emergency, maternity, paternity)
- Start Date (date picker)
- End Date (date picker)
- Reason (optional text)
- Shows remaining leave balance
- Validates dates (end must be after start)
- Calculates days requested automatically
- Checks against remaining leave allowance
- Submits to `submitLeaveRequest` action
- Real-time updates after submission

**Data Source**: `leave_requests` table filtered by employee ID

#### E. Salary Information
**Component**: `src/components/salary-information.tsx`

Displays:

**Current Salary Card**:
- Current base salary amount
- Effective date
- Currency

**Change Indicator Card**:
- Shows increment/decrement from previous salary
- Visual indicators:
  - ↑ Green for increment
  - ↓ Red for decrement
  - Flat icon for no change
- Displays absolute change amount
- Labels: "Increment applied" / "Decrement applied" / "No change"

**Last Evaluation Card**:
- Overall rating (e.g., 4.5/5)
- Evaluation period dates

**Salary History Table**:
- Effective Date
- Salary Amount
- Type (monthly/annual)
- Currency
- Shows last 5 records

**Performance-Based Logic**:
- Salary changes are driven by `performance_evaluations` table
- Each evaluation can include:
  - `salary_adjustment_percentage`: % increase/decrease
  - `bonus_amount`: One-time bonus
  - `overall_rating`: 1.0 to 5.0 scale
  - `performance_score`: Numeric score
- New salary records are created with effective dates
- Component calculates and displays the difference

**Data Sources**:
- `salary_records` table
- `performance_evaluations` table

#### F. Profile Update Form
**Component**: `src/components/profile-update-form.tsx`

Allows users to:
- Update all personal information fields
- Change department
- Update contact details
- Modify emergency contacts

**Note**: Cannot change Employee ID (read-only, system-generated)

## Database Schema

### Key Tables

**employees**:
- Primary employee record
- Links to `auth.users` via `user_id`
- Contains all personal information
- `annual_leave_remaining` field for leave balance

**attendance_records**:
- Daily attendance entries
- Status: present, absent, partial, holiday, sick
- Check-in/check-out times
- Total hours calculated

**leave_requests**:
- Leave applications
- Status: pending, approved, rejected
- Links to approver (manager)
- Days requested calculated from date range

**salary_records**:
- Historical salary data
- Effective dates for tracking changes
- Supports monthly/annual salary types

**performance_evaluations**:
- Performance review records
- Overall rating and performance score
- Links to evaluator
- Includes salary adjustment recommendations

## Security & Data Access

**Row Level Security (RLS)**: All tables have RLS policies

**Employee Access Rules**:
```sql
-- Employees can only see their own records
WHERE employee_id IN (
  SELECT e.id FROM public.employees e 
  WHERE e.user_id = auth.uid()
)
```

**Policy Enforcement**:
- Employees can SELECT their own records
- Employees can INSERT their own records
- Employees can UPDATE their own records
- Employees CANNOT see other employees' data

## User Experience Flow

### First Login
1. User signs up or logs in
2. Middleware validates and routes to employee dashboard
3. System checks for employee profile
4. **Profile Missing**: Shows onboarding form
5. User fills out required information
6. System generates employee ID automatically
7. Profile saved to database
8. Automatic redirect to dashboard
9. Full dashboard loads with all features

### Subsequent Logins
1. User logs in
2. Middleware routes to employee dashboard
3. System finds existing profile
4. **Profile Exists**: Shows full dashboard immediately
5. User can view and manage:
   - Personal information
   - Attendance records
   - Leave history and requests
   - Salary information
   - Update profile details

## Component Reusability

All dashboard components are located in `src/components/` and follow these principles:

- **Modular**: Each component handles one responsibility
- **Reusable**: Can be imported and used in other pages
- **Typed**: Full TypeScript support with defined props
- **Styled**: Uses shadcn/ui components for consistency
- **Data-driven**: Fetches own data using Supabase client
- **Accessible**: Proper ARIA labels and semantic HTML

### Available UI Components

All from `src/components/ui/`:
- `card`, `button`, `input`, `label`, `select`
- `table`, `skeleton`, `avatar`, `badge`
- `chart` (for visualizations)
- `dialog`, `drawer` (for modals)
- Plus many more in the ui folder

## API Actions

**Location**: `src/app/employee/dashboard/actions.ts`

Available server actions:
- `createEmployeeProfile`: Creates new employee record
- `updateEmployeeProfile`: Updates existing employee data
- `submitLeaveRequest`: Submits new leave request
- `deleteEmployeeProfile`: Removes employee record
- `deleteLeaveRequest`: Cancels leave request

All actions:
- Validate input with Zod schemas
- Check user authentication
- Verify user owns the record being modified
- Revalidate page cache on success
- Return typed state objects for UI feedback

## Configuration

**Constants**: `src/lib/constants.ts`
```typescript
export const ANNUAL_LEAVE_ALLOWANCE = 20; // days per year
```

**Types**: `src/lib/types.ts`
- Contains all TypeScript interfaces
- Matches database schema
- Used throughout application

## Best Practices

1. **Access Control**: Always verify profile exists before showing dashboard features
2. **Data Validation**: Use Zod schemas for all form submissions
3. **User Feedback**: Show loading states, success/error messages
4. **Optimization**: Use React Suspense and loading skeletons
5. **Caching**: Revalidate paths after mutations
6. **Type Safety**: Leverage TypeScript for compile-time checks

## Future Enhancements

Potential additions to the workflow:
- Email notifications for leave approvals
- Mobile app support
- Document upload functionality
- Performance goal tracking
- Team directory integration
- Calendar integration for leave requests
- Export attendance/salary reports to PDF

---

**Last Updated**: October 15, 2025
**Version**: 1.0
