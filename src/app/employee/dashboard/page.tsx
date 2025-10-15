import { redirect } from "next/navigation";

import { AttendanceSummary } from "@/components/attendance-summary";
import {
  EmployeeDashboardSummary,
  type EmployeeDashboardSummaryData,
} from "@/components/employee-dashboard-summary";
import { EmployeeProfileSetupForm } from "@/components/employee-profile-setup-form";
import { EmployeePersonalInfo } from "@/components/employee-personal-info";
import { LeaveManagement } from "@/components/leave-management";
import { LogoutButton } from "@/components/logout-button";
import { ProfileUpdateForm } from "@/components/profile-update-form";
import { SalaryInformation } from "@/components/salary-information";
import { createClient } from "@/lib/server";
import { Department, Employee, UserRole } from "@/lib/types";
import { ANNUAL_LEAVE_ALLOWANCE } from "@/lib/constants";

export default async function EmployeeDashboard() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userRole = data.claims.user_metadata?.role as UserRole | undefined;
  if (!userRole) {
    redirect("/protected");
  }

  const { data: employeeData } = await supabase
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
        annual_leave_remaining,
        department:departments(id,name,description)
      `
    )
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  const employee = (employeeData as Employee | null) ?? null;
  const { data: departmentData } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  const departments =
    (departmentData as Array<Pick<Department, "id" | "name">>) ?? [];
  const summary = employee
    ? await buildEmployeeSummary(
        supabase,
        employee.id,
        employee.annual_leave_remaining ?? null
      )
    : null;
  const userEmail = data.claims.email as string | null | undefined;

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
                {employee
                  ? `Welcome back, ${employee.first_name} ${employee.last_name}`
                  : "Complete your employee profile"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Review your personal details, track attendance and leave,
                monitor salary changes, and keep your profile up to date.
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>

        {employee ? (
          <>
            <EmployeeDashboardSummary data={summary} isLoading={!employee} />

            <EmployeePersonalInfo employee={employee} />

            <section className="grid gap-6 lg:grid-cols-2">
              <AttendanceSummary employeeId={employee.id} />
              <LeaveManagement
                employeeId={employee.id}
                remainingLeave={employee.annual_leave_remaining ?? undefined}
              />
            </section>

            <SalaryInformation employeeId={employee.id} />

            <ProfileUpdateForm employee={employee} departments={departments} />
          </>
        ) : (
          <EmployeeProfileSetupForm
            email={userEmail}
            departments={departments}
          />
        )}
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
