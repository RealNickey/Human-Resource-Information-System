"use client";

import { useState, useTransition } from "react";
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";

import {
  createEmployeeProfile,
  type CreateProfileState,
} from "@/app/employee/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Department } from "@/lib/types";

interface EmployeeProfileSetupFormProps {
  email: string | null | undefined;
  departments?: Array<Pick<Department, "id" | "name">>;
}

export function EmployeeProfileSetupForm({
  email,
  departments,
}: EmployeeProfileSetupFormProps) {
  const [state, setState] = useState<CreateProfileState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await createEmployeeProfile(state, formData);
      setState(result);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Welcome! Let's set up your employee profile
        </CardTitle>
        <CardDescription>
          Complete your profile to access your personalized dashboard with attendance tracking,
          leave management, and salary information. All fields can be updated later.
        </CardDescription>
      </CardHeader>
      <form className="grid gap-6" action={handleAction}>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-dashed border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm md:col-span-2">
            <p className="font-medium text-emerald-900 dark:text-emerald-100 mb-1">
              📋 What happens after you submit?
            </p>
            <ul className="text-emerald-800 dark:text-emerald-200 space-y-1 ml-4 list-disc">
              <li>Your unique employee ID will be generated automatically</li>
              <li>You'll be redirected to your full employee dashboard</li>
              <li>You can immediately view attendance, request leave, and check salary info</li>
              <li>All information can be updated anytime from your profile settings</li>
            </ul>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              value={email ?? ""}
              readOnly
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              name="first_name"
              placeholder="First name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              name="last_name"
              placeholder="Last name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input id="date_of_birth" name="date_of_birth" type="date" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_of_joining">Date of joining</Label>
            <Input
              id="date_of_joining"
              name="date_of_joining"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="department_id">Department</Label>
            <select
              id="department_id"
              name="department_id"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select department</option>
              {departments && departments.length ? (
                departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))
              ) : (
                // Fallback departments requested: Sales, HR, IT, Marketing, Customer Support
                [
                  "Sales",
                  "HR",
                  "IT",
                  "Marketing",
                  "Customer Support",
                ].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" name="phone" placeholder="e.g. +1 555 123 4567" />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={3} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergency_contact_name">Emergency contact</Label>
            <Input
              id="emergency_contact_name"
              name="emergency_contact_name"
              placeholder="Contact name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergency_contact_phone">Emergency phone</Label>
            <Input
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              placeholder="e.g. +1 555 987 6543"
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <StatusMessage state={state} isPending={isPending} />
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? (
              <>
                <IconLoader className="mr-2 size-4 animate-spin" />
                Creating your profile...
              </>
            ) : (
              "Complete Setup & Access Dashboard"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function StatusMessage({ 
  state, 
  isPending 
}: { 
  state: CreateProfileState;
  isPending: boolean;
}) {
  if (state.status === "success") {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
        <IconCircleCheckFilled className="size-4" />
        {state.message} Redirecting to dashboard...
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-sm text-rose-600 font-medium">
        ⚠️ {state.message}
      </p>
    );
  }

  if (isPending) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <IconLoader className="size-4 animate-spin" />
        Setting up your profile...
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Required fields: First name, Last name, Date of joining
    </p>
  );
}
