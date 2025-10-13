"use server";

import { revalidatePath } from "next/cache";
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

const profileSchema = z.object({
  employee_id: z.coerce.number(),
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
      .select("id, user_id")
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
