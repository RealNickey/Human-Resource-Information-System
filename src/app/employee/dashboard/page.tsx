import type { CSSProperties } from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { AttendanceSummary } from "@/components/attendance-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeePersonalInfo } from "@/components/employee-personal-info";
import { LeaveManagement } from "@/components/leave-management";
import { ProfileUpdateForm } from "@/components/profile-update-form";
import { SalaryInformation } from "@/components/salary-information";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <EmployeePersonalInfo employee={employee} />
              </div>

              {employee ? (
                <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
                  <AttendanceSummary employeeId={employee.id} />
                  <LeaveManagement employeeId={employee.id} />
                </div>
              ) : (
                <div className="px-4 lg:px-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">
                        Finish setting up your profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        We could not find your employee profile yet. Please
                        contact your HR administrator to complete onboarding.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="px-4 lg:px-6">
                <SalaryInformation employeeId={employee?.id} />
              </div>

              <div className="px-4 lg:px-6">
                <ProfileUpdateForm employee={employee} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
