import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

import { AttendanceSummary } from "@/components/attendance-summary";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/server";
import { Employee, UserRole } from "@/lib/types";

export default async function AttendancePage() {
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
    .select("id, user_id, first_name, last_name")
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  const employee =
    (employeeData as Pick<
      Employee,
      "id" | "user_id" | "first_name" | "last_name"
    > | null) ?? null;

  if (!employee) {
    redirect("/employee/dashboard");
  }

  return (
    <main className="min-h-screen bg-muted/20 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
                <Link href="/employee/dashboard/overview">
                  <IconArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                📊 Attendance Tracker
              </h1>
              <p className="text-sm text-muted-foreground">
                View your attendance records and track your working days.
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <section>
          <AttendanceSummary employeeId={employee.id} />
        </section>
      </div>
    </main>
  );
}
