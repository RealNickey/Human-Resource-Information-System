"use client";

import { useEffect, useState, useTransition } from "react";
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";

import {
  updateEmployeeProfile,
  type UpdateProfileState,
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
import { Employee } from "@/lib/types";

interface ProfileUpdateFormProps {
  employee: Employee | null;
}

export function ProfileUpdateForm({ employee }: ProfileUpdateFormProps) {
  const [state, setState] = useState<UpdateProfileState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    setFormKey((key) => key + 1);
  }, [employee?.id]);

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await updateEmployeeProfile(state, formData);
      setState(result);
    });
  }

  if (!employee) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Profile</CardTitle>
        <CardDescription>
          Keep your contact information current.
        </CardDescription>
      </CardHeader>
      <form key={formKey} action={handleAction}>
        <input type="hidden" name="employee_id" value={employee.id} />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={employee.phone ?? ""}
              placeholder="e.g. +1 555 123 4567"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              defaultValue={employee.email}
              readOnly
              disabled
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={employee.address ?? ""}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergency_contact_name">Emergency contact</Label>
            <Input
              id="emergency_contact_name"
              name="emergency_contact_name"
              defaultValue={employee.emergency_contact_name ?? ""}
              placeholder="Contact name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergency_contact_phone">Emergency phone</Label>
            <Input
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              defaultValue={employee.emergency_contact_phone ?? ""}
              placeholder="e.g. +1 555 987 6543"
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <StatusMessage state={state} />
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <IconLoader className="mr-2 size-4 animate-spin" />
            ) : null}
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function StatusMessage({ state }: { state: UpdateProfileState }) {
  if (state.status === "success") {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-600">
        <IconCircleCheckFilled className="size-4" />
        {state.message}
      </p>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-rose-600">{state.message}</p>;
  }

  return (
    <p className="text-xs text-muted-foreground">
      Changes require manager approval for certain fields.
    </p>
  );
}
