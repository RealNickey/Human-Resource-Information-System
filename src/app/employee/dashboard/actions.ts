"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/server";
import { LeaveType } from "@/lib/types";

export type UpdateProfileState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type LeaveRequestState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type CreateProfileState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type DeleteProfileState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type DeleteLeaveState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const departmentIdSchema = z
  .preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().int().positive().nullable())
  .optional();

const profileSchema = z.object({
  employee_id: z.coerce.number(),
  first_name: z.string().trim().min(1, "First name is required").max(255),
  last_name: z.string().trim().min(1, "Last name is required").max(255),
  date_of_birth: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "Provide a valid date of birth"
    ),
  date_of_joining: z
    .string()
    .min(1, "Date of joining is required")
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Provide a valid joining date"
    ),
  department_id: departmentIdSchema,
  position: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(255).optional(),
  address: z.string().trim().max(1024).optional(),
  emergency_contact_name: z.string().trim().max(255).optional(),
  emergency_contact_phone: z.string().trim().max(255).optional(),
});

export async function updateEmployeeProfile(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  try {
    const submission = profileSchema.parse(Object.fromEntries(formData));

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be signed in." };
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, user_id")
      .eq("id", submission.employee_id)
      .single();

    if (employeeError || !employee) {
      return { status: "error", message: "Employee not found." };
    }

    if (employee.user_id !== user.id) {
      return {
        status: "error",
        message: "You can only update your own profile.",
      };
    }

    const updates = {
      first_name: submission.first_name,
      last_name: submission.last_name,
      date_of_birth: submission.date_of_birth || null,
      date_of_joining: submission.date_of_joining,
      department_id: submission.department_id ?? null,
      position: submission.position || null,
      phone: submission.phone || null,
      address: submission.address || null,
      emergency_contact_name: submission.emergency_contact_name || null,
      emergency_contact_phone: submission.emergency_contact_phone || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("employees")
      .update(updates)
      .eq("id", submission.employee_id);

    if (error) {
      console.error("Failed to update profile", error);
      return { status: "error", message: "Could not save your changes." };
    }

    revalidatePath("/employee/dashboard");

    return { status: "success", message: "Profile updated successfully." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "error", message: "Invalid form submission." };
    }
    console.error("Unexpected error updating profile", error);
    return {
      status: "error",
      message: "Something went wrong, please try again.",
    };
  }
}

const leaveSchema = z.object({
  employee_id: z.coerce.number(),
  leave_type: z.enum([
    "vacation",
    "sick",
    "personal",
    "emergency",
    "maternity",
    "paternity",
  ] satisfies readonly LeaveType[]),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  reason: z.string().trim().max(1024).optional(),
});

const createProfileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(255),
  last_name: z.string().trim().min(1, "Last name is required").max(255),
  date_of_birth: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "Provide a valid date of birth"
    ),
  date_of_joining: z
    .string()
    .min(1, "Date of joining is required")
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Provide a valid joining date"
    ),
  department_id: departmentIdSchema,
  position: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(255).optional(),
  address: z.string().trim().max(1024).optional(),
  emergency_contact_name: z.string().trim().max(255).optional(),
  emergency_contact_phone: z.string().trim().max(255).optional(),
});

const deleteProfileSchema = z.object({
  employee_id: z.coerce.number(),
});

const deleteLeaveSchema = z.object({
  leave_id: z.coerce.number(),
});

function generateEmployeeCode(userId: string) {
  const sanitized = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const prefix = sanitized.slice(0, 6) || "USER";
  const randomSegment = randomUUID()
    .replace(/-/g, "")
    .slice(0, 4)
    .toUpperCase();
  return `EMP-${prefix}${randomSegment}`;
}

async function generateUniqueEmployeeCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateEmployeeCode(userId);
    const { data, error } = await supabase
      .from("employees")
      .select("id")
      .eq("employee_id", candidate)
      .maybeSingle();

    if (error) {
      console.error("Failed to check employee ID availability", error);
      break;
    }

    if (!data) {
      return candidate;
    }
  }

  return `EMP-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export async function submitLeaveRequest(
  _prevState: LeaveRequestState,
  formData: FormData
): Promise<LeaveRequestState> {
  try {
    const submission = leaveSchema.parse(Object.fromEntries(formData));

    const startDate = new Date(submission.start_date);
    const endDate = new Date(submission.end_date);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { status: "error", message: "Enter valid dates." };
    }

    if (endDate < startDate) {
      return { status: "error", message: "End date must be after start date." };
    }

    const dayMillis = 1000 * 60 * 60 * 24;
    const daysRequested =
      Math.floor((endDate.getTime() - startDate.getTime()) / dayMillis) + 1;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be signed in." };
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, user_id, annual_leave_remaining")
      .eq("id", submission.employee_id)
      .single();

    if (employeeError || !employee) {
      return { status: "error", message: "Employee profile not found." };
    }

    if (employee.user_id !== user.id) {
      return {
        status: "error",
        message: "You can only request leave for your own account.",
      };
    }

    if (
      typeof employee.annual_leave_remaining === "number" &&
      daysRequested > employee.annual_leave_remaining
    ) {
      return {
        status: "error",
        message: `You only have ${employee.annual_leave_remaining} days remaining.`,
      };
    }

    const { error } = await supabase.from("leave_requests").insert({
      employee_id: submission.employee_id,
      leave_type: submission.leave_type,
      start_date: submission.start_date,
      end_date: submission.end_date,
      reason: submission.reason || null,
      days_requested: daysRequested,
      status: "pending",
    });

    if (error) {
      console.error("Failed to submit leave request", error);
      return { status: "error", message: "Could not submit your request." };
    }

    revalidatePath("/employee/dashboard");

    return {
      status: "success",
      message: "Leave request submitted for approval.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        message: "Please complete all required fields.",
      };
    }
    console.error("Unexpected error submitting leave request", error);
    return {
      status: "error",
      message: "Something went wrong, please try again.",
    };
  }
}

export async function createEmployeeProfile(
  _prevState: CreateProfileState,
  formData: FormData
): Promise<CreateProfileState> {
  try {
    // Convert empty strings to null/undefined for proper validation
    const rawData = Object.fromEntries(formData);
    const cleanedData = Object.fromEntries(
      Object.entries(rawData).map(([key, value]) => [
        key,
        typeof value === "string" && value.trim() === "" ? null : value,
      ])
    );

    const submission = createProfileSchema.parse(cleanedData);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be signed in." };
    }

    const userEmail = user.email;
    if (!userEmail) {
      return {
        status: "error",
        message: "Your account must have an email address configured.",
      };
    }

    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return {
        status: "error",
        message: "You already have an employee profile.",
      };
    }

    const employeeCode = await generateUniqueEmployeeCode(supabase, user.id);

    const { error } = await supabase.from("employees").insert({
      user_id: user.id,
      employee_id: employeeCode,
      first_name: submission.first_name,
      last_name: submission.last_name,
      email: userEmail,
      date_of_birth: submission.date_of_birth || null,
      date_of_joining: submission.date_of_joining,
      department_id: submission.department_id ?? null,
      position: submission.position || null,
      phone: submission.phone || null,
      address: submission.address || null,
      emergency_contact_name: submission.emergency_contact_name || null,
      emergency_contact_phone: submission.emergency_contact_phone || null,
    });

    if (error) {
      console.error("Failed to create employee profile", error);
      return {
        status: "error",
        message: "Could not create your profile. Please try again in a moment.",
      };
    }

    revalidatePath("/employee/dashboard");
    redirect("/employee/dashboard");
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        status: "error",
        message: firstError
          ? `${firstError.path.join(".")}: ${firstError.message}`
          : "Please complete all required fields correctly.",
      };
    }
    console.error("Unexpected error creating employee profile", error);
    return {
      status: "error",
      message: "Something went wrong, please try again.",
    };
  }
}

export async function deleteEmployeeProfile(
  _prevState: DeleteProfileState,
  formData: FormData
): Promise<DeleteProfileState> {
  try {
    const submission = deleteProfileSchema.parse(Object.fromEntries(formData));

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be signed in." };
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, user_id")
      .eq("id", submission.employee_id)
      .single();

    if (employeeError || !employee) {
      return { status: "error", message: "Employee profile not found." };
    }

    if (employee.user_id !== user.id) {
      return {
        status: "error",
        message: "You can only delete your own profile.",
      };
    }

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", submission.employee_id);

    if (error) {
      console.error("Failed to delete employee profile", error);
      return { status: "error", message: "Could not delete your profile." };
    }

    revalidatePath("/employee/dashboard");

    return {
      status: "success",
      message: "Profile deleted successfully.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "error", message: "Invalid request." };
    }
    console.error("Unexpected error deleting employee profile", error);
    return {
      status: "error",
      message: "Something went wrong, please try again.",
    };
  }
}

export async function deleteLeaveRequest(
  _prevState: DeleteLeaveState,
  formData: FormData
): Promise<DeleteLeaveState> {
  try {
    const submission = deleteLeaveSchema.parse(Object.fromEntries(formData));

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be signed in." };
    }

    const { data: leave, error: leaveError } = await supabase
      .from("leave_requests")
      .select("id, employee_id")
      .eq("id", submission.leave_id)
      .single();

    if (leaveError || !leave) {
      return { status: "error", message: "Leave request not found." };
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, user_id")
      .eq("id", leave.employee_id)
      .single();

    if (employeeError || !employee || employee.user_id !== user.id) {
      return {
        status: "error",
        message: "You can only manage your own leave requests.",
      };
    }

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", submission.leave_id);

    if (error) {
      console.error("Failed to delete leave request", error);
      return { status: "error", message: "Could not delete leave request." };
    }

    revalidatePath("/employee/dashboard");

    return {
      status: "success",
      message: "Leave request deleted.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "error", message: "Invalid request." };
    }
    console.error("Unexpected error deleting leave request", error);
    return {
      status: "error",
      message: "Something went wrong, please try again.",
    };
  }
}
