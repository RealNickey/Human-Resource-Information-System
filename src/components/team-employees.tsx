"use client";

import { useEffect, useMemo, useState } from "react";
import { IconRefresh, IconUser } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Employee, LatestPerformance, LatestSalary } from "@/lib/types";
import { createClient } from "@/lib/client";

type EmployeeRow = Employee & {
  annual_leave_remaining: number | null | undefined;
  latestSalary?: LatestSalary | null;
  latestPerformance?: LatestPerformance | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function formatCurrency(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function TeamEmployees() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(
    null
  );

  async function loadEmployees() {
    setIsLoading((current) => current && !isRefreshing);
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
            id,
            user_id,
            employee_id,
            first_name,
            last_name,
            email,
            date_of_birth,
            date_of_joining,
            department_id,
            position,
            phone,
            address,
            emergency_contact_name,
            emergency_contact_phone,
            annual_leave_remaining
          `
        )
        .order("last_name", { ascending: true });

      if (error) throw error;

      const baseEmployees = (data ?? []) as EmployeeRow[];
      const employeeIds = baseEmployees.map((employee) => employee.id);

      if (employeeIds.length === 0) {
        setEmployees([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const [{ data: salaries }, { data: performances }] = await Promise.all([
        supabase
          .from("latest_salary")
          .select("employee_id, base_salary, currency, effective_date")
          .in("employee_id", employeeIds),
        supabase
          .from("latest_performance")
          .select(
            "employee_id, overall_rating, performance_score, evaluation_period_end"
          )
          .in("employee_id", employeeIds),
      ]);

      const salaryMap = new Map<number, LatestSalary | null>();
      const performanceMap = new Map<number, LatestPerformance | null>();

      (salaries ?? []).forEach((entry) => {
        salaryMap.set(entry.employee_id, entry as LatestSalary);
      });

      (performances ?? []).forEach((entry) => {
        performanceMap.set(entry.employee_id, entry as LatestPerformance);
      });

      setEmployees(
        baseEmployees.map((employee) => ({
          ...employee,
          latestSalary: salaryMap.get(employee.id) ?? null,
          latestPerformance: performanceMap.get(employee.id) ?? null,
        }))
      );
    } catch (error) {
      console.error("Failed to load employees", error);
      setEmployees([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalRemainingLeave = useMemo(() => {
    return employees.reduce((total, employee) => {
      return total + (employee.annual_leave_remaining ?? 0);
    }, 0);
  }, [employees]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Employees</CardTitle>
            <p className="text-sm text-muted-foreground">
              Remaining leave across team: {totalRemainingLeave}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadEmployees()}
            disabled={isRefreshing}
          >
            <IconRefresh className="mr-1 size-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Remaining Leave</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : employees.length ? (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.employee_id}
                      </TableCell>
                      <TableCell>
                        {employee.first_name} {employee.last_name}
                      </TableCell>
                      <TableCell>{employee.position || "—"}</TableCell>
                      <TableCell>
                        {employee.annual_leave_remaining ?? 0}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          employee.latestSalary?.base_salary ?? null,
                          employee.latestSalary?.currency ?? "USD"
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.latestPerformance
                          ? `${(
                              employee.latestPerformance.overall_rating ?? 0
                            ).toFixed(1)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEmployee(employee)}
                        >
                          <IconUser className="mr-1 size-4" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No employees available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-4">
              <div className="grid gap-6 md:grid-cols-2">
                <InfoCell
                  label="Employee ID"
                  value={selectedEmployee.employee_id}
                />
                <InfoCell label="Email" value={selectedEmployee.email} />
                <InfoCell
                  label="Position"
                  value={selectedEmployee.position || "—"}
                />
                <InfoCell
                  label="Date of Joining"
                  value={formatDate(selectedEmployee.date_of_joining)}
                />
                <InfoCell label="Phone" value={selectedEmployee.phone || "—"} />
                <InfoCell
                  label="Date of Birth"
                  value={formatDate(selectedEmployee.date_of_birth)}
                />
              </div>
              <InfoCell
                label="Address"
                value={selectedEmployee.address || "—"}
              />
              <div className="grid gap-6 md:grid-cols-2">
                <InfoCell
                  label="Emergency Contact"
                  value={selectedEmployee.emergency_contact_name || "—"}
                />
                <InfoCell
                  label="Emergency Phone"
                  value={selectedEmployee.emergency_contact_phone || "—"}
                />
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                <InfoCell
                  label="Remaining Leave"
                  value={`${selectedEmployee.annual_leave_remaining ?? 0} days`}
                />
                <InfoCell
                  label="Latest Salary"
                  value={formatCurrency(
                    selectedEmployee.latestSalary?.base_salary ?? null,
                    selectedEmployee.latestSalary?.currency ?? "USD"
                  )}
                />
                <InfoCell
                  label="Last Performance Score"
                  value={
                    selectedEmployee.latestPerformance
                      ? `${(
                          selectedEmployee.latestPerformance.overall_rating ?? 0
                        ).toFixed(1)}`
                      : "—"
                  }
                />
              </div>
              {selectedEmployee.latestPerformance && (
                <InfoCell
                  label="Performance Period End"
                  value={formatDate(
                    selectedEmployee.latestPerformance.evaluation_period_end
                  )}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface InfoCellProps {
  label: string;
  value: string;
}

function InfoCell({ label, value }: InfoCellProps) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
