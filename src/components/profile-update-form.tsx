"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Employee, type Department } from "@/lib/types";

interface ProfileUpdateFormProps {
  employee: Employee | null;
  departments: Array<Pick<Department, "id" | "name">>;
}

interface UpdateFormData {
  first_name: string;
  last_name: string;
  date_of_birth: Date | undefined;
  date_of_joining: Date | undefined;
  department_id: string;
  position: string;
  phone: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface FieldError {
  field: string;
  message: string;
}

export function ProfileUpdateForm({
  employee,
  departments,
}: ProfileUpdateFormProps) {
  const router = useRouter();
  const [state, setState] = useState<UpdateProfileState>({ status: "idle" });
  const [deleteState, setDeleteState] = useState<DeleteProfileState>({
    status: "idle",
  });
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  // Initialize form data from employee prop
  const [formData, setFormData] = useState<UpdateFormData>({
    first_name: employee?.first_name || "",
    last_name: employee?.last_name || "",
    date_of_birth: employee?.date_of_birth
      ? new Date(employee.date_of_birth)
      : undefined,
    date_of_joining: employee?.date_of_joining
      ? new Date(employee.date_of_joining)
      : undefined,
    department_id: employee?.department_id?.toString() || "",
    position: employee?.position || "",
    phone: employee?.phone || "",
    address: employee?.address || "",
    emergency_contact_name: employee?.emergency_contact_name || "",
    emergency_contact_phone: employee?.emergency_contact_phone || "",
  });

  // Update form data when employee prop changes
  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || "",
        last_name: employee.last_name || "",
        date_of_birth: employee.date_of_birth
          ? new Date(employee.date_of_birth)
          : undefined,
        date_of_joining: employee.date_of_joining
          ? new Date(employee.date_of_joining)
          : undefined,
        department_id: employee.department_id?.toString() || "",
        position: employee.position || "",
        phone: employee.phone || "",
        address: employee.address || "",
        emergency_contact_name: employee.emergency_contact_name || "",
        emergency_contact_phone: employee.emergency_contact_phone || "",
      });
    }
  }, [employee]);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: FieldError[] = [];

    if (!formData.first_name.trim()) {
      errors.push({ field: "first_name", message: "First name is required" });
    }
    if (!formData.last_name.trim()) {
      errors.push({ field: "last_name", message: "Last name is required" });
    }
    if (!formData.date_of_joining) {
      errors.push({
        field: "date_of_joining",
        message: "Date of joining is required",
      });
    }

    setFieldErrors(errors);
    return errors.length === 0;
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return fieldErrors.find((error) => error.field === fieldName)?.message;
  };

  function handleAction(nativeFormData: globalThis.FormData) {
    // Clear previous errors
    setFieldErrors([]);

    // Validate form before submission
    if (!validateForm()) {
      setState({
        status: "error",
        message: "Please complete all required fields correctly",
      });
      return;
    }

    startTransition(async () => {
      const result = await updateEmployeeProfile(state, nativeFormData);
      setState(result);
      if (result.status === "success") {
        router.refresh();
      }
      // On error, form data is preserved via state
    });
  }

  function handleDelete(nativeFormData: globalThis.FormData) {
    startDeleteTransition(async () => {
      const result = await deleteEmployeeProfile(deleteState, nativeFormData);
      setDeleteState(result);
      if (result.status === "success") {
        router.refresh();
      }
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
      <form action={handleAction}>
        <input type="hidden" name="employee_id" value={employee.id} />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1">
            <Label className="text-muted-foreground">Employee ID</Label>
            <Input
              value={employee.employee_id}
              readOnly
              disabled
              className="bg-muted"
            />
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
              type="email"
              value={employee.email}
              readOnly
              disabled
              autoComplete="email"
              className="bg-muted"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="first_name">
              First name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              name="first_name"
              placeholder="John"
              required
              autoComplete="given-name"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              aria-invalid={!!getFieldError("first_name")}
              aria-describedby={
                getFieldError("first_name") ? "first_name-error" : undefined
              }
              className={
                getFieldError("first_name") ? "border-destructive" : ""
              }
            />
            {getFieldError("first_name") && (
              <p id="first_name-error" className="text-sm text-destructive">
                {getFieldError("first_name")}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last_name">
              Last name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              name="last_name"
              placeholder="Doe"
              required
              autoComplete="family-name"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              aria-invalid={!!getFieldError("last_name")}
              aria-describedby={
                getFieldError("last_name") ? "last_name-error" : undefined
              }
              className={getFieldError("last_name") ? "border-destructive" : ""}
            />
            {getFieldError("last_name") && (
              <p id="last_name-error" className="text-sm text-destructive">
                {getFieldError("last_name")}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <DatePicker
              id="date_of_birth"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={(date) =>
                setFormData({ ...formData, date_of_birth: date })
              }
              placeholder="Select your birth date"
              autoComplete="bday"
              toDate={new Date()}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_of_joining">
              Date of joining <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id="date_of_joining"
              name="date_of_joining"
              value={formData.date_of_joining}
              onChange={(date) =>
                setFormData({ ...formData, date_of_joining: date })
              }
              placeholder="Select your joining date"
              required
              aria-invalid={!!getFieldError("date_of_joining")}
              aria-describedby={
                getFieldError("date_of_joining")
                  ? "date_of_joining-error"
                  : undefined
              }
              className={
                getFieldError("date_of_joining") ? "border-destructive" : ""
              }
            />
            {getFieldError("date_of_joining") && (
              <p
                id="date_of_joining-error"
                className="text-sm text-destructive"
              >
                {getFieldError("date_of_joining")}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="department_id">Department</Label>
            <select
              id="department_id"
              name="department_id"
              value={formData.department_id}
              onChange={(e) =>
                setFormData({ ...formData, department_id: e.target.value })
              }
              autoComplete="organization-title"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
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
              placeholder="e.g. Software Engineer"
              autoComplete="organization-title"
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              rows={3}
              placeholder="123 Main Street, City, State, ZIP"
              autoComplete="street-address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergency_contact_name">
              Emergency contact name
            </Label>
            <Input
              id="emergency_contact_name"
              name="emergency_contact_name"
              placeholder="Jane Doe"
              autoComplete="name"
              value={formData.emergency_contact_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  emergency_contact_name: e.target.value,
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergency_contact_phone">
              Emergency contact phone
            </Label>
            <Input
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              type="tel"
              placeholder="+1 (555) 987-6543"
              autoComplete="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  emergency_contact_phone: e.target.value,
                })
              }
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
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-left-2 duration-300">
        <IconCircleCheckFilled className="size-4" />
        <span>{state.message}</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-left-2 duration-300">
        <span className="text-base" aria-hidden="true">
          ⚠️
        </span>
        <span role="alert">{state.message}</span>
      </div>
    );
  }

  return (
    <div className="text-xs text-muted-foreground">
      Changes require manager approval for certain fields.
    </div>
  );
}

function DeleteStatus({ state }: { state: DeleteProfileState }) {
  if (state.status === "success") {
    return (
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-left-2 duration-300">
        <IconCircleCheckFilled className="size-4" />
        <span>{state.message}</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-left-2 duration-300">
        <span className="text-base" aria-hidden="true">
          ⚠️
        </span>
        <span role="alert">{state.message}</span>
      </div>
    );
  }

  return <div className="text-muted-foreground">Deleting is permanent.</div>;
}
