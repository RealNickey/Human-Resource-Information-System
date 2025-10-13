"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { createClient } from "@/lib/client";

interface ManagerAttendanceTrackingProps {
  departmentId: number | null | undefined;
}

type AttendanceWithEmployee = AttendanceRecord & {
  employee_name: string;
  employee_id_str: string;
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

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ManagerAttendanceTracking({
  departmentId,
}: ManagerAttendanceTrackingProps) {
  const [records, setRecords] = useState<AttendanceWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      if (!departmentId) {
        setRecords([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

        const { data: employees } = await supabase
          .from("employees")
          .select("id, employee_id, first_name, last_name")
          .eq("department_id", departmentId);

        if (!employees || employees.length === 0) {
          if (!cancelled) setRecords([]);
          return;
        }

        const employeeMap = new Map(
          employees.map((e) => [
            e.id,
            { name: `${e.first_name} ${e.last_name}`, empId: e.employee_id },
          ])
        );
        const employeeIds = employees.map((e) => e.id);

        const { data: attendanceData, error } = await supabase
          .from("attendance_records")
          .select("*")
          .in("employee_id", employeeIds)
          .gte("date", thirtyDaysAgoStr)
          .order("date", { ascending: false })
          .limit(100);

        if (error) throw error;

        if (!cancelled) {
          const recordsWithNames: AttendanceWithEmployee[] =
            attendanceData?.map((record) => {
              const empInfo = employeeMap.get(record.employee_id);
              return {
                ...record,
                employee_name: empInfo?.name || "Unknown",
                employee_id_str: empInfo?.empId || "—",
              };
            }) ?? [];
          setRecords(recordsWithNames);
        }
      } catch (error) {
        console.error("Failed to load attendance records", error);
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  const filteredRecords = records.filter((record) =>
    record.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Attendance Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
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
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
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
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-12" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredRecords.length ? (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>{record.employee_name}</TableCell>
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
                    {searchQuery
                      ? "No matching attendance records found."
                      : "No attendance records found."}
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
