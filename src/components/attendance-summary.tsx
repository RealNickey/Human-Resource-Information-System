"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconClockHour4,
} from "@tabler/icons-react";

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
import { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { createClient } from "@/lib/client";

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

type AttendanceSummaryProps = {
  employeeId: number | null | undefined;
};

type AttendanceMetrics = {
  presentDays: number;
  absentDays: number;
  totalHours: number;
  leaveDays: number;
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function AttendanceSummary({ employeeId }: AttendanceSummaryProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadAttendance() {
      if (!employeeId) {
        setRecords([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const supabase = createClient();
        const firstDay = currentMonth.toISOString().slice(0, 10);
        const lastDay = addMonths(currentMonth, 1).toISOString().slice(0, 10);

        const { data, error } = await supabase
          .from("attendance_records")
          .select("*")
          .gte("date", firstDay)
          .lt("date", lastDay)
          .eq("employee_id", employeeId)
          .order("date", { ascending: false });

        if (error) throw error;
        if (!ignore) {
          setRecords(data ?? []);
        }
      } catch (error) {
        console.error("Failed to load attendance", error);
        if (!ignore) setRecords([]);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadAttendance();

    return () => {
      ignore = true;
    };
  }, [currentMonth, employeeId]);

  const metrics = useMemo<AttendanceMetrics>(() => {
    if (!records.length)
      return { presentDays: 0, absentDays: 0, totalHours: 0, leaveDays: 0 };

    return records.reduce(
      (acc, record) => {
        if (record.status === "present" || record.status === "partial") {
          acc.presentDays += 1;
        }
        if (record.status === "absent") {
          acc.absentDays += 1;
        }
        if (record.status === "sick" || record.status === "holiday") {
          acc.leaveDays += 1;
        }
        acc.totalHours += record.total_hours ?? 0;
        return acc;
      },
      { presentDays: 0, absentDays: 0, totalHours: 0, leaveDays: 0 }
    );
  }, [records]);

  const monthLabel = monthFormatter.format(currentMonth);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-semibold">Attendance</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((date) => addMonths(date, -1))}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm font-medium">
            <IconCalendar className="size-4 text-muted-foreground" />
            {monthLabel}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((date) => addMonths(date, 1))}
          >
            <IconArrowRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <AttendanceMetric
            label="Days present"
            value={metrics.presentDays}
            isLoading={isLoading}
          />
          <AttendanceMetric
            label="Days absent"
            value={metrics.absentDays}
            isLoading={isLoading}
          />
          <AttendanceMetric
            label="Leave days"
            value={metrics.leaveDays}
            isLoading={isLoading}
          />
          <AttendanceMetric
            label="Hours logged"
            value={metrics.totalHours.toFixed(1)}
            icon={<IconClockHour4 className="size-4" />}
            isLoading={isLoading}
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-32">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Total hours</TableHead>
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
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-12" />
                    </TableCell>
                  </TableRow>
                ))
              ) : records.length ? (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.date)}</TableCell>
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
                    colSpan={3}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No attendance records found for this month.
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

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

type AttendanceMetricProps = {
  label: string;
  value: string | number;
  isLoading?: boolean;
  icon?: ReactNode;
};

function AttendanceMetric({
  label,
  value,
  isLoading,
  icon,
}: AttendanceMetricProps) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 pt-1">
        {icon}
        {isLoading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <span className="text-lg font-semibold">{value}</span>
        )}
      </div>
    </div>
  );
}
