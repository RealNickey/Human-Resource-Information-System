import { redirect } from "next/navigation";

import { ManagerAttendanceTracking } from "@/components/manager-attendance-tracking";
import { ManagerLeaveRequests } from "@/components/manager-leave-requests";
import { TeamAnnouncements } from "@/components/team-announcements";
import { TeamEmployees } from "@/components/team-employees";
import { TeamPerformance } from "@/components/team-performance";
import { createClient } from "@/lib/server";
import { Employee, UserRole } from "@/lib/types";

export default async function ManagerDashboard() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userRole = data.claims.user_metadata?.role as UserRole | undefined;

  // Ensure only managers and admins can access this page
  if (userRole !== "manager" && userRole !== "admin") {
    redirect("/protected");
  }

  // Get manager's employee profile
  const { data: managerData } = await supabase
    .from("employees")
    .select("id, first_name, last_name, department_id")
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  const manager = (managerData as Employee | null) ?? null;

  return (
    <main className="min-h-screen bg-muted/20 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Manager Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {manager
              ? `Welcome, ${manager.first_name} ${manager.last_name}`
              : "Manager Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your team, track performance, and approve leave requests.
          </p>
        </header>

        <TeamPerformance departmentId={manager?.department_id} />

        <TeamEmployees departmentId={manager?.department_id} />

        <section className="grid gap-6 lg:grid-cols-2">
          <ManagerAttendanceTracking departmentId={manager?.department_id} />
          <TeamAnnouncements departmentId={manager?.department_id} />
        </section>

        <ManagerLeaveRequests
          departmentId={manager?.department_id}
          managerId={manager?.id}
        />
      </div>
    </main>
  );
}
