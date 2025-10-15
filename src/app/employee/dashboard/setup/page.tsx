import { redirect } from "next/navigation";

import { EmployeeProfileSetupForm } from "@/components/employee-profile-setup-form";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/server";
import { UserRole } from "@/lib/types";

export default async function EmployeeProfileSetup() {
  const supabase = await createClient();

  // Verify authentication
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userRole = data.claims.user_metadata?.role as UserRole | undefined;

  // Only employees and managers can access this page
  if (!userRole || !["employee", "manager"].includes(userRole)) {
    redirect("/protected");
  }

  const userEmail = data.claims.email;

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  // If profile exists, redirect to overview
  if (existingProfile) {
    redirect("/employee/dashboard/overview");
  }

  return (
    <main className="min-h-screen bg-muted/20 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 sm:px-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Employee Onboarding
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Complete Your Profile
              </h1>
              <p className="text-sm text-muted-foreground">
                Please fill in your details to access your employee dashboard
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <EmployeeProfileSetupForm email={userEmail} />
      </div>
    </main>
  );
}
