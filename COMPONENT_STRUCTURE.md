# Component Structure - Manager Dashboard

## Component Hierarchy

```
Manager Dashboard Page (/app/manager/dashboard/page.tsx)
│
├── Header Section
│   ├── Welcome Message (Manager Name)
│   └── Description Text
│
├── TeamPerformance Component
│   └── Average Weekly Performance Score Card
│
├── TeamEmployees Component
│   ├── Employee List Table
│   │   ├── Employee ID
│   │   ├── Name
│   │   ├── Position
│   │   └── View Profile Button
│   └── Employee Profile Dialog (Read-only)
│       ├── Personal Information
│       ├── Employment Details
│       └── Emergency Contacts
│
├── Two-Column Grid
│   │
│   ├── ManagerAttendanceTracking Component
│   │   ├── Search Filter (by employee name)
│   │   └── Attendance Table
│   │       ├── Date
│   │       ├── Employee Name
│   │       ├── Status (color-coded)
│   │       └── Hours Worked
│   │
│   └── TeamAnnouncements Component
│       ├── Announcement Text Area
│       └── Send Button
│
└── ManagerLeaveRequests Component
    └── Leave Requests Table
        ├── Employee ID
        ├── Name
        ├── From Date
        ├── To Date
        ├── Reason
        ├── Status Badge
        └── Action Buttons
            ├── Approve Button (for pending)
            └── Reject Button (for pending)
```

## Data Flow

```
Manager Dashboard Page (Server Component)
    ↓
Fetches manager's employee profile from Supabase
    ↓
Passes department_id and manager_id to child components
    ↓
    ├── TeamPerformance (Client Component)
    │   └── Fetches performance_evaluations filtered by department
    │
    ├── TeamEmployees (Client Component)
    │   └── Fetches employees filtered by department
    │
    ├── ManagerAttendanceTracking (Client Component)
    │   ├── Fetches employees in department
    │   └── Fetches attendance_records for those employees
    │
    ├── TeamAnnouncements (Client Component)
    │   └── Handles announcement submission
    │
    └── ManagerLeaveRequests (Client Component)
        ├── Fetches employees in department
        ├── Fetches leave_requests for those employees
        └── Updates leave_requests on approve/reject
```

## Component Props

### TeamPerformance
- `departmentId: number | null | undefined`

### TeamEmployees
- `departmentId: number | null | undefined`

### ManagerAttendanceTracking
- `departmentId: number | null | undefined`

### TeamAnnouncements
- `departmentId: number | null | undefined`

### ManagerLeaveRequests
- `departmentId: number | null | undefined`
- `managerId: number | null | undefined`

## Reused UI Components

All components utilize the following shared UI components from `/components/ui/`:
- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead`
- `Button`
- `Input`
- `Textarea`
- `Label`
- `Skeleton`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`

## State Management

Each component manages its own state using React hooks:
- `useState` for local state (data, loading, UI state)
- `useEffect` for data fetching on mount
- `useTransition` for pending states during mutations
- `useCallback` for memoized functions

## Loading States

All components implement skeleton loading states:
- Display skeleton components while data is being fetched
- Replace with actual content once loaded
- Show appropriate empty states when no data is available

## Error Handling

- Console logging for debugging
- Toast notifications for user feedback (success/error)
- Graceful fallbacks for missing data
- Null/undefined checks throughout
