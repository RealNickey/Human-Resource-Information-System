import { redirect } from "next/navigation";

import { AttendanceSummary } from "@/components/attendance-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeePersonalInfo } from "@/components/employee-personal-info";
import { LeaveManagement } from "@/components/leave-management";
import { LogoutButton } from "@/components/logout-button";
import { ProfileUpdateForm } from "@/components/profile-update-form";
import { SalaryInformation } from "@/components/salary-information";
import { createClient } from "@/lib/server";
import { Employee, UserRole } from "@/lib/types";

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
        department:departments(id,name,description)
      `
    )
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  const employee = (employeeData as Employee | null) ?? null;

  return (
    <main className="min-h-screen bg-muted/20 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">Employee Dashboard</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {employee
                  ? `Welcome back, ${employee.first_name} ${employee.last_name}`
                  : "Complete your employee profile"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Review your personal details, track attendance and leave, monitor salary changes, and keep your profile up to date.
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <EmployeePersonalInfo employee={employee} />

        {employee ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <AttendanceSummary employeeId={employee.id} />
            <LeaveManagement employeeId={employee.id} />
          </section>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                We couldn’t find your employee profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Please contact your HR administrator so they can finish onboarding you into the system.
              </p>
            </CardContent>
          </Card>
        )}

        <SalaryInformation employeeId={employee?.id} />

        <ProfileUpdateForm employee={employee} />
      </div>
    </main>
  );
}
