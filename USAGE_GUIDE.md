# Manager Dashboard Usage Guide

## Accessing the Manager Dashboard

The manager dashboard is available at `/manager/dashboard` and can only be accessed by users with the `manager` or `admin` role.

## Prerequisites

Before using the manager dashboard, ensure:

1. **Database Setup**: Run all migrations in order:
   ```bash
   # Apply migrations
   supabase db push
   ```

2. **User Setup**: 
   - Create a user account with manager role in Supabase Auth
   - Create an employee record linked to that user with a `department_id`
   - Ensure other employees exist in the same department for testing

3. **Dummy Data** (Optional): 
   - The dummy data migration provides sample data for testing
   - Update the UUIDs in the migration to match your actual auth users

## Features Overview

### 1. Team Performance Score
- Displays the average performance score for your team from the last 7 days
- Calculated from `performance_evaluations` table
- Shows "—" if no recent evaluations exist

### 2. Team Members List
- Shows all employees in your department
- Displays: Employee ID, Name, Position
- Click "View Profile" to see complete employee details in a read-only dialog

### 3. Attendance Tracking
- Shows last 30 days of attendance records for all team members
- **Search Feature**: Type employee name to filter records
- Color-coded status badges:
  - 🟢 Green: Present
  - 🔴 Red: Absent
  - 🟡 Yellow: Partial Day
  - 🔵 Blue: Holiday
  - 🔴 Pink: Sick Leave

### 4. Team Announcements
- Create announcements for your team members
- Type your message in the text area
- Click "Send Announcement" to broadcast
- (Note: Currently shows success toast, actual persistence can be implemented)

### 5. Leave Request Management
- View all leave requests from your team
- Columns: Employee ID, Name, From/To dates, Reason, Status
- **Pending Requests**: Show Approve/Reject buttons
- **Processed Requests**: Display approval/rejection status
- Actions are tracked with manager ID and timestamp

## Database Permissions

The manager dashboard uses Row Level Security (RLS) policies that allow managers to:

✅ View all employees in their department
✅ View team attendance records
✅ View team leave requests
✅ Update leave request status (approve/reject)
✅ View team performance evaluations

❌ Cannot view/edit data from other departments
❌ Cannot view/edit their own leave requests through manager dashboard

## Workflow Examples

### Approving a Leave Request

1. Navigate to the Leave Requests section at the bottom
2. Find a pending request (yellow "Pending" badge)
3. Review the employee name, dates, and reason
4. Click "Approve" or "Reject" button
5. Request status updates immediately
6. Success notification appears

### Checking Team Attendance

1. Scroll to the Attendance Tracking section
2. Use the search box to find a specific employee
3. Review their recent attendance records
4. Check total hours worked per day

### Viewing Employee Details

1. Find the employee in the Team Members list
2. Click "View Profile" button
3. Review complete information in the dialog:
   - Personal info (email, phone, DOB, address)
   - Employment details (position, joining date)
   - Emergency contacts
4. Close dialog when done (read-only)

## Troubleshooting

### "No team members found"
- Ensure your employee record has a `department_id` set
- Check that other employees exist with the same `department_id`

### "No recent evaluations"
- Add performance evaluation records to the database
- Ensure evaluations have `evaluation_period_end` within the last 7 days

### Can't see leave requests
- Verify employees in your department have submitted leave requests
- Check RLS policies are properly applied

### Approve/Reject not working
- Ensure your employee record exists and has an `id`
- Check browser console for any error messages
- Verify Supabase connection is working

## Next Steps

Consider implementing:
- Email notifications for leave request decisions
- Persistent announcement system with database storage
- Export attendance/leave reports to CSV
- Performance analytics dashboard with charts
- Real-time updates using Supabase subscriptions
