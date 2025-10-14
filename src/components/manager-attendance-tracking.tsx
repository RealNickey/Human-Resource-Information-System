"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { IconCalendar, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { createClient } from "@/lib/client";

type EmployeeOption = {
  id: number;
  employeeCode: string;
  displayName: string;
};

type AttendanceWithEmployee = AttendanceRecord & {
  employee_name: string;
  employee_code: string;
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  partial: "Partial Day",
  holiday: "Holiday",
  sick: "Sick Leave",
};

const statusVariants: Record<AttendanceStatus, string> = {
  present:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
  absent: "bg-red-100 text-red-900 dark:bg-red-500/10 dark:text-red-200",
  partial:
    "bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200",
  holiday: "bg-sky-100 text-sky-900 dark:bg-sky-500/10 dark:text-sky-200",
  sick: "bg-rose-100 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200",
};

const MANAGER_MARKABLE_STATUSES: AttendanceStatus[] = ["present", "absent"];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtractDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() - days);
  return clone;
}

function formatDisplayDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ManagerAttendanceTracking() {
  const today = useMemo(() => new Date(), []);
  const [dateRange, setDateRange] = useState(() => ({
    from: toIsoDate(subtractDays(today, 6)),
    to: toIsoDate(today),
  }));
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [records, setRecords] = useState<AttendanceWithEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(dateRange.to);
  const [selectedStatus, setSelectedStatus] =
    useState<AttendanceStatus>("present");
  const [isSubmitting, startTransition] = useTransition();

  async function loadEmployees() {
    setIsLoadingEmployees(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employees")
        .select("id, employee_id, first_name, last_name")
        .order("last_name", { ascending: true });

      if (error) throw error;

      const employeeOptions = (data ?? []).map((employee) => ({
        id: employee.id,
        employeeCode: employee.employee_id,
        displayName: `${employee.first_name} ${employee.last_name}`,
      }));

      setEmployees(employeeOptions);
      if (employeeOptions.length && !selectedEmployeeId) {
        setSelectedEmployeeId(String(employeeOptions[0].id));
      }
    } catch (error) {
      console.error("Failed to load employees", error);
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  }

  async function loadAttendance(range = dateRange) {
    if (!employees.length) {
      setRecords([]);
      setIsLoadingRecords(false);
      return;
    }

    setIsLoadingRecords(true);
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const employeeIds = employees.map((employee) => employee.id);
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .in("employee_id", employeeIds)
        .gte("date", range.from)
        .lte("date", range.to)
        .order("date", { ascending: false });

      if (error) throw error;

      const employeeMap = new Map<number, EmployeeOption>();
      employees.forEach((employee) => {
        employeeMap.set(employee.id, employee);
      });

      setRecords(
        (data ?? []).map((record) => {
          const details = employeeMap.get(record.employee_id);
          return {
            ...record,
            employee_name: details?.displayName ?? "Unknown",
            employee_code: details?.employeeCode ?? "—",
          };
        })
      );
    } catch (error) {
      console.error("Failed to load attendance", error);
      setRecords([]);
    } finally {
      setIsLoadingRecords(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoadingEmployees) {
      void loadAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingEmployees, employees.length]);

  useEffect(() => {
    if (!isLoadingEmployees) {
      void loadAttendance(dateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to]);

  const presentCount = useMemo(() => {
    return records.filter((record) => record.status === "present").length;
  }, [records]);

  const absentCount = useMemo(() => {
    return records.filter((record) => record.status === "absent").length;
  }, [records]);

  const handleMarkAttendance = () => {
    if (!selectedEmployeeId) {
      toast.error("Select an employee to mark attendance.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const payload = {
          employee_id: Number(selectedEmployeeId),
          date: selectedDate,
          status: selectedStatus,
        };

        const { error } = await supabase
          .from("attendance_records")
          .upsert(payload, { onConflict: "employee_id,date" });

        if (error) throw error;

        toast.success("Attendance saved.");
        await loadAttendance(dateRange);
      } catch (error) {
        console.error("Failed to mark attendance", error);
        toast.error("Unable to save attendance.");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Attendance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Present: {presentCount} • Absent: {absentCount}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadAttendance(dateRange)}
          disabled={isRefreshing}
        >
          <IconRefresh className="mr-1 size-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="grid gap-4 rounded-md border p-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="attendance-employee">Employee</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={(value) => setSelectedEmployeeId(value)}
              disabled={isLoadingEmployees}
            >
              <SelectTrigger id="attendance-employee">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.employeeCode} — {employee.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="attendance-date">Date</Label>
            <div className="relative">
              <IconCalendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="attendance-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="attendance-status">Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus(value as AttendanceStatus)
              }
            >
              <SelectTrigger id="attendance-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {MANAGER_MARKABLE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button onClick={handleMarkAttendance} disabled={isSubmitting}>
              Save attendance
            </Button>
          </div>
        </section>

        <section className="grid gap-4 rounded-md border p-4 md:grid-cols-4">
          <div>
            <Label htmlFor="attendance-from">From</Label>
            <Input
              id="attendance-from"
              type="date"
              value={dateRange.from}
              max={dateRange.to}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="attendance-to">To</Label>
            <Input
              id="attendance-to"
              type="date"
              value={dateRange.to}
              min={dateRange.from}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
            />
          </div>
          <div className="md:col-span-2 flex items-end text-sm text-muted-foreground">
            Showing records between {formatDisplayDate(dateRange.from)} and{" "}
            {formatDisplayDate(dateRange.to)}.
          </div>
        </section>

        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRecords ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-12" />
                    </TableCell>
                  </TableRow>
                ))
              ) : records.length ? (
                records.map((record) => (
                  <TableRow key={`${record.employee_id}-${record.date}`}>
                    <TableCell>{formatDisplayDate(record.date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {record.employee_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {record.employee_code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          statusVariants[record.status]
                        }`}
                      >
                        {statusLabels[record.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {record.total_hours
                        ? `${record.total_hours.toFixed(1)} h`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No attendance records found for the selected range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
