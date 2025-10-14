# Database Migrations

This directory contains SQL migrations for the HR Information System.

## Migrations

### `20251013224000_create_employee_hr_tables.sql`
Creates the core database schema including:
- Departments
- Employees
- Attendance records
- Leave requests
- Salary records
- Performance evaluations
- Row-level security policies for employee access

### `20251013230000_add_manager_policies.sql`
Adds additional RLS policies to allow managers to:
- View all employees in their department
- View team attendance records
- View and update team leave requests
- View team performance evaluations

### `20251013231000_add_dummy_data.sql`
Populates the database with sample data for testing:
- 4 departments
- 5 sample employees
- 30 days of attendance records
- Sample leave requests
- Salary history
- Performance evaluations

## Running Migrations

If you're using Supabase CLI:

```bash
# Apply all pending migrations
supabase db push

# Or apply them individually
psql -f supabase/migrations/20251013224000_create_employee_hr_tables.sql
psql -f supabase/migrations/20251013230000_add_manager_policies.sql
psql -f supabase/migrations/20251013231000_add_dummy_data.sql
```

## Important Notes

### For Dummy Data Migration

The dummy data migration uses placeholder UUIDs for user_id fields. In a production environment:

1. First create actual users in Supabase Auth
2. Update the dummy data SQL with real user UUIDs
3. Or use the Supabase Dashboard to manually create employee records

The placeholder UUIDs follow this pattern:
- `00000000-0000-0000-0000-000000000001` for EMP001
- `00000000-0000-0000-0000-000000000002` for EMP002
- etc.

### Security Considerations

All tables have Row Level Security (RLS) enabled with policies that:
- Allow employees to see only their own data
- Allow managers to see data for employees in their department
- Properly segregate data access based on authentication

Make sure to test policies thoroughly before deploying to production.
