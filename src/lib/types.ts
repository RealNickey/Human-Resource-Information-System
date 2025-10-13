export type UserRole = "admin" | "manager" | "employee";

export interface UserMetadata {
  role?: UserRole;
  full_name?: string;
}

export interface UserWithRole {
  email: string;
  role: UserRole;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  manager_id?: number;
}

export interface Employee {
  id: number;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string | null;
  date_of_joining: string;
  department_id?: number | null;
  position?: string | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  created_at?: string;
  updated_at?: string;
  department?: Department | null;
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "partial"
  | "holiday"
  | "sick";

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  break_duration_minutes?: number | null;
  total_hours?: number | null;
  status: AttendanceStatus;
  notes?: string | null;
}

export type LeaveType =
  | "vacation"
  | "sick"
  | "personal"
  | "emergency"
  | "maternity"
  | "paternity";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string | null;
  status: LeaveStatus;
  approved_by?: number | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type SalaryType = "monthly" | "annual";

export interface SalaryRecord {
  id: number;
  employee_id: number;
  base_salary: number;
  effective_date: string;
  salary_type: SalaryType;
  currency: string;
  created_at?: string;
}

export interface PerformanceEvaluation {
  id: number;
  employee_id: number;
  evaluation_period_start: string;
  evaluation_period_end: string;
  overall_rating: number;
  performance_score?: number | null;
  goals_achieved?: number | null;
  total_goals?: number | null;
  evaluator_id?: number | null;
  comments?: string | null;
  salary_adjustment_percentage?: number | null;
  bonus_amount?: number | null;
  created_at?: string;
}
