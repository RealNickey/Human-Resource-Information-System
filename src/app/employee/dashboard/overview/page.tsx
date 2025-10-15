import { redirect } from "next/navigation";
import Link from "next/link";
import {
  IconCalendar,
  IconClockHour4,
  IconUser,
  IconCoins,
  IconChartBar,
} from "@tabler/icons-react";

import {
  EmployeeDashboardSummary,
  type EmployeeDashboardSummaryData,
} from "@/components/employee-dashboard-summary";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/server";
import { Employee, UserRole } from "@/lib/types";
import { ANNUAL_LEAVE_ALLOWANCE } from "@/lib/constants";

export default async function EmployeeDashboardOverview() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userRole = data.claims.user_metadata?.role as UserRole | undefined;
  if (!userRole) {
    redirect("/protected");
  }

  const { data: employeeRecord, error: employeeError } = await supabase
    .from("employees")
    .select(
      `
        id,
        user_id,
        employee_id,
        first_name,
        last_name,
        email,
        date_of_birth,
        date_of_joining,
        department_id,
        position,
        phone,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        annual_leave_remaining
      `
    )
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  if (employeeError) {
    console.error("Failed to load employee profile", employeeError);

    return (
      <main className="min-h-screen bg-muted/20 py-10">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 sm:px-6">
          <div className="flex justify-end">
            <LogoutButton />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Profile Not Available</CardTitle>
              <CardDescription>
                We couldn&apos;t load your employee profile at the moment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please try again shortly or contact support if the issue
                persists. No data was lost.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!employeeRecord) {
    redirect("/employee/dashboard/setup");
  }

  let department: Employee["department"] = null;
  if (employeeRecord.department_id) {
    const { data: departmentData, error: departmentError } = await supabase
      .from("departments")
      .select("id, name, description")
      .eq("id", employeeRecord.department_id)
      .maybeSingle();

    if (departmentError) {
      console.error("Failed to load department details", departmentError);
    } else if (departmentData) {
      department = departmentData as Employee["department"];
    }
  }

  const employee: Employee = {
    ...employeeRecord,
    department,
  };

  const summary = await buildEmployeeSummary(
    supabase,
    employee.id,
    employee.annual_leave_remaining ?? null
  );

  return (
    <main className="min-h-screen bg-muted/20 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Employee Dashboard
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Welcome back, {employee.first_name} {employee.last_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Quick overview of your employment status and quick actions
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* Dashboard Summary Stats */}
        <EmployeeDashboardSummary data={summary} isLoading={false} />

        {/* Quick Action Cards */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            🚀 Quick Actions
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Personal Information Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <IconUser className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Personal Info</CardTitle>
                    <CardDescription className="text-xs">
                      View and update
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your personal details, contact information, and
                  emergency contacts.
                </p>
                <Button asChild className="w-full">
                  <Link href="/employee/dashboard/personal-info">
                    <IconUser className="mr-2 h-4 w-4" />
                    View Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Attendance Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                    <IconChartBar className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Attendance</CardTitle>
                    <CardDescription className="text-xs">
                      Track your days
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View attendance records and track your working days this
                  month.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/employee/dashboard/attendance">
                    <IconClockHour4 className="mr-2 h-4 w-4" />
                    View Attendance
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Leave Management Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <IconCalendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Leave & Time Off
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {summary.leavesRemaining} days remaining
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Request time off and view your leave history and balances.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/employee/dashboard/leave">
                    <IconCalendar className="mr-2 h-4 w-4" />
                    Manage Leave
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Salary Information Card */}
            <Card className="hover:shadow-md transition-shadow md:col-span-2 lg:col-span-3">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <IconCoins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Salary & Compensation
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Next payday: {summary.nextPaydayLabel}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View salary details, performance-based adjustments,
                  increments, and compensation history.
                </p>
                <Button asChild variant="outline" className="w-full md:w-auto">
                  <Link href="/employee/dashboard/salary">
                    <IconCoins className="mr-2 h-4 w-4" />
                    View Salary Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

const friendlyDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function buildEmployeeSummary(
  supabase: SupabaseServerClient,
  employeeId: number,
  initialRemaining: number | null
): Promise<EmployeeDashboardSummaryData> {
  const now = new Date();
  const monthStartIso = toIsoDate(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const nextMonthStartIso = toIsoDate(
    new Date(now.getFullYear(), now.getMonth() + 1, 1)
  );
  const yearStartIso = toIsoDate(new Date(now.getFullYear(), 0, 1));
  const nextYearStartIso = toIsoDate(new Date(now.getFullYear() + 1, 0, 1));

  const [attendanceResult, leaveResult] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("status")
      .eq("employee_id", employeeId)
      .gte("date", monthStartIso)
      .lt("date", nextMonthStartIso),
    supabase
      .from("leave_requests")
      .select("days_requested")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("start_date", yearStartIso)
      .lt("start_date", nextYearStartIso),
  ]);

  if (attendanceResult.error) {
    console.error("Failed to load attendance summary", attendanceResult.error);
  }

  if (leaveResult.error) {
    console.error("Failed to load leave summary", leaveResult.error);
  }

  const attendance = attendanceResult.data ?? [];
  const leaveRequests = leaveResult.data ?? [];

  const daysWorkedThisMonth = attendance.filter(
    (record) => record.status === "present" || record.status === "partial"
  ).length;

  const leaveDaysTakenThisYear = leaveRequests.reduce(
    (total, request) => total + (request.days_requested ?? 0),
    0
  );

  const computedRemaining = Math.max(
    ANNUAL_LEAVE_ALLOWANCE - leaveDaysTakenThisYear,
    0
  );
  const leavesRemaining = initialRemaining ?? computedRemaining;
  const nextPayday = calculateNextPayday(now);

  return {
    daysWorkedThisMonth,
    leaveDaysTakenThisYear,
    leavesRemaining,
    nextPaydayLabel: friendlyDateFormatter.format(nextPayday),
  };
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateNextPayday(reference: Date) {
  const current = new Date(reference);
  current.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(
    current.getFullYear(),
    current.getMonth() + 1,
    0
  ).getDate();

  const targetDay = Math.min(30, daysInMonth);
  let payday = new Date(current.getFullYear(), current.getMonth(), targetDay);
  payday.setHours(0, 0, 0, 0);

  if (payday <= current) {
    const nextMonth = new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      1
    );
    const nextMonthDays = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth() + 1,
      0
    ).getDate();

    payday = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      Math.min(30, nextMonthDays)
    );
    payday.setHours(0, 0, 0, 0);
  }

  return payday;
}
