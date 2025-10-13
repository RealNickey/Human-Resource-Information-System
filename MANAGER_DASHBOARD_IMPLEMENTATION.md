# Manager Dashboard Implementation

## Overview
This document describes the implementation of the manager dashboard features for the Human Resource Information System.

## Features Implemented

### 1. Team Performance Component (`team-performance.tsx`)
- Displays the average weekly performance score of the team
- Calculates performance based on evaluations from the last 7 days
- Shows a clear metric with the current score or "No recent evaluations" message

### 2. Team Employees List Component (`team-employees.tsx`)
- Lists all employees in the manager's department
- Shows Employee ID, Name, and Position
- Includes a "View Profile" button for each employee
- Opens a read-only dialog with complete employee information including:
  - Personal details (email, phone, date of birth, address)
  - Employment information (position, joining date)
  - Emergency contact information

### 3. Manager Attendance Tracking Component (`manager-attendance-tracking.tsx`)
- Displays attendance records for all team members (last 30 days)
- Includes a search filter to find specific employees by name
- Shows date, employee name, status, and hours worked
- Color-coded status badges for easy visualization

### 4. Manager Leave Requests Component (`manager-leave-requests.tsx`)
- Lists all leave requests from team members
- Shows Employee ID, Name, From/To dates, Reason, and Status
- Provides Approve/Reject buttons for pending requests
- Updates are reflected immediately with toast notifications
- Color-coded status indicators (pending, approved, rejected)

### 5. Team Announcements Component (`team-announcements.tsx`)
- Allows managers to create announcements for team members
- Simple textarea for entering announcement text
- Send button to broadcast the announcement
- Toast notification on successful submission

## Database Changes

### New Policies (`20251013230000_add_manager_policies.sql`)
Created row-level security policies to allow managers to:
- View all employees in their department
- View team attendance records
- View and update team leave requests
- View team performance evaluations

### Dummy Data (`20251013231000_add_dummy_data.sql`)
Added sample data for testing including:
- 4 departments (Engineering, HR, Marketing, Sales)
- 5 sample employees with complete profiles
- 30 days of attendance records for each employee
- Sample leave requests in various states
- Salary records for all employees
- Performance evaluations for demonstration

## UI Components Used

All components follow the existing design system and reuse components from `/components/ui/`:
- Card, CardHeader, CardTitle, CardContent
- Table, TableHeader, TableBody, TableRow, TableCell, TableHead
- Button, Input, Textarea, Label
- Skeleton (for loading states)
- Dialog (newly created for employee profile view)
- Toast notifications (via Sonner)

## Layout Structure

The manager dashboard uses a clean, organized layout:
1. Header with welcome message
2. Team Performance card (full width)
3. Team Employees list (full width)
4. Two-column grid:
   - Attendance Tracking (left)
   - Team Announcements (right)
5. Leave Requests table (full width)

## Technical Details

- All components are client-side rendered with "use client" directive
- Uses Supabase client for real-time data fetching
- Implements proper loading states with skeletons
- Includes error handling and user feedback via toast notifications
- Follows React best practices with proper hooks usage
- TypeScript types are properly defined and imported from `/lib/types.ts`

## Security

- Manager can only access data from their own department
- Row-level security policies ensure data isolation
- Leave request approvals are properly tracked with manager ID and timestamp

## Future Enhancements

Potential improvements that could be added:
- Real announcement system with persistence to database
- Email notifications for leave request decisions
- More detailed performance analytics with charts
- Export functionality for reports
- Filtering and sorting options for all tables
- Pagination for large datasets
