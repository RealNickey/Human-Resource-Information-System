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
import { DatePicker } from "@/components/ui/date-picker";

interface EmployeeProfileSetupFormProps {
  email: string | null | undefined;
}

interface FormData {
  first_name: string;
  last_name: string;
  date_of_birth: Date | undefined;
  date_of_joining: Date | undefined;
  phone: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface FieldError {
  field: string;
  message: string;
}

export function EmployeeProfileSetupForm({
  email,
}: EmployeeProfileSetupFormProps) {
  const [state, setState] = useState<CreateProfileState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  // Initialize form data with default date of joining as today
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    date_of_birth: undefined,
    date_of_joining: new Date(),
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

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
      const result = await createEmployeeProfile(state, nativeFormData);
      setState(result);

      // Only clear form on success
      if (result.status === "success") {
        // Form will redirect, no need to clear
      }
      // On error, form data is preserved via state
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Welcome! Let&apos;s set up your employee profile
        </CardTitle>
        <CardDescription>
          Complete your profile to access your personalized dashboard with
          attendance tracking, leave management, and salary information. All
          fields can be updated later.
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
              <li>You&apos;ll be redirected to your full employee dashboard</li>
              <li>
                You can immediately view attendance, request leave, and check
                salary info
              </li>
              <li>
                All information can be updated anytime from your profile
                settings
              </li>
            </ul>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email ?? ""}
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
            <p className="text-xs text-muted-foreground">
              Optional: Used for birthday notifications
            </p>
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
            <p className="text-xs text-muted-foreground">
              Optional: For work-related communications
            </p>
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
            <p className="text-xs text-muted-foreground">
              Optional: Your current residential address
            </p>
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
            <p className="text-xs text-muted-foreground">
              Optional: Person to contact in case of emergency
            </p>
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
            <p className="text-xs text-muted-foreground">
              Optional: Emergency contact phone number
            </p>
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
  isPending,
}: {
  state: CreateProfileState;
  isPending: boolean;
}) {
  if (state.status === "success") {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in slide-in-from-left-2 duration-300">
        <IconCircleCheckFilled className="size-4" />
        <span>{state.message} Redirecting to dashboard...</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 font-medium animate-in fade-in slide-in-from-left-2 duration-300">
        <span className="text-base" aria-hidden="true">
          ⚠️
        </span>
        <span role="alert">{state.message}</span>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <IconLoader className="size-4 animate-spin" aria-hidden="true" />
        <span>Setting up your profile...</span>
      </div>
    );
  }

  return (
    <div className="text-xs text-muted-foreground">
      <span className="font-medium">Required fields:</span> First name, Last
      name, Date of joining
    </div>
  );
}
