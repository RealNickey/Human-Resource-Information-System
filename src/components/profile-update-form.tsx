"use client";

import { useEffect, useState, useTransition } from "react";
import {
  IconCircleCheckFilled,
  IconLoader,
  IconTrash,
} from "@tabler/icons-react";

import {
  updateEmployeeProfile,
  deleteEmployeeProfile,
  type UpdateProfileState,
  type DeleteProfileState,
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
import { Employee, type Department } from "@/lib/types";

interface ProfileUpdateFormProps {
  employee: Employee | null;
  departments: Array<Pick<Department, "id" | "name">>;
}

export function ProfileUpdateForm({
  employee,
  departments,
}: ProfileUpdateFormProps) {
  const [state, setState] = useState<UpdateProfileState>({ status: "idle" });
  const [deleteState, setDeleteState] = useState<DeleteProfileState>({
    status: "idle",
  });
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
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

  function handleDelete(formData: FormData) {
    startDeleteTransition(async () => {
      const result = await deleteEmployeeProfile(deleteState, formData);
      setDeleteState(result);
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
          Keep your employment information current. Deleting your profile
          removes all related records.
        </CardDescription>
      </CardHeader>
      <form key={formKey} action={handleAction}>
        <input type="hidden" name="employee_id" value={employee.id} />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1">
            <Label className="text-muted-foreground">Employee ID</Label>
            <Input defaultValue={employee.employee_id} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              Assigned automatically by the system.
            </p>
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
          <div className="grid gap-2">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              name="first_name"
              defaultValue={employee.first_name}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              name="last_name"
              defaultValue={employee.last_name}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={employee.date_of_birth ?? undefined}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_of_joining">Date of joining</Label>
            <Input
              id="date_of_joining"
              name="date_of_joining"
              type="date"
              defaultValue={employee.date_of_joining}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="department_id">Department</Label>
            <select
              id="department_id"
              name="department_id"
              defaultValue={employee.department_id ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              name="position"
              defaultValue={employee.position ?? ""}
              placeholder="e.g. Software Engineer"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={employee.phone ?? ""}
              placeholder="e.g. +1 555 123 4567"
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
      <form
        action={handleDelete}
        className="flex items-center justify-between gap-2 border-t px-6 pb-6 pt-4 text-sm"
      >
        <input type="hidden" name="employee_id" value={employee.id} />
        <DeleteStatus state={deleteState} />
        <Button
          variant="outline"
          type="submit"
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? (
            <IconLoader className="mr-2 size-4 animate-spin" />
          ) : (
            <IconTrash className="mr-2 size-4" />
          )}
          Delete profile
        </Button>
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

function DeleteStatus({ state }: { state: DeleteProfileState }) {
  if (state.status === "success") {
    return (
      <p className="flex items-center gap-2 text-emerald-600">
        <IconCircleCheckFilled className="size-4" />
        {state.message}
      </p>
    );
  }

  if (state.status === "error") {
    return <p className="text-rose-600">{state.message}</p>;
  }

  return <p className="text-muted-foreground">Deleting is permanent.</p>;
}
