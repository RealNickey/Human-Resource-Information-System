import { redirect } from "next/navigation";

export default async function EmployeeDashboard() {
  // Simply redirect to overview - it will handle profile creation if needed
  redirect("/employee/dashboard/overview");
}
