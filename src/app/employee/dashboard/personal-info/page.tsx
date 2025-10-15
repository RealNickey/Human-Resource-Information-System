import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

import { EmployeePersonalInfo } from "@/components/employee-personal-info";
import { ProfileUpdateForm } from "@/components/profile-update-form";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/server";
import { Employee, Department, UserRole } from "@/lib/types";

export default async function PersonalInfoPage() {
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

  if (!employee) {
    redirect("/employee/dashboard");
  }

  const { data: departmentData } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  const departments =
    (departmentData as Array<Pick<Department, "id" | "name">>) ?? [];

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
                📋 Personal Information
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage your personal details, contact information, and
                emergency contacts.
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* Personal Information Display */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Current Information
          </h2>
          <EmployeePersonalInfo employee={employee} />
        </section>

        {/* Profile Update Form */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Update Profile
          </h2>
          <ProfileUpdateForm employee={employee} departments={departments} />
        </section>
      </div>
    </main>
  );
}
