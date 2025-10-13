"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconClockHour4,
} from "@tabler/icons-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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

function addDays(date: Date, delta: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + delta);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday as the first day
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const attendanceChartConfig = {
  presentDays: {
    label: "Present days",
    color: "hsl(152, 63%, 45%)",
  },
  absenceDays: {
    label: "Absences & leave",
    color: "hsl(0, 72%, 52%)",
  },
} as const;

export function AttendanceSummary({ employeeId }: AttendanceSummaryProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const rangeStart = useMemo(
    () => startOfMonth(addMonths(currentMonth, -2)),
    [currentMonth]
  );
  const rangeEnd = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);

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
        const firstDay = formatDateKey(rangeStart);
        const lastDay = formatDateKey(rangeEnd);

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
  }, [employeeId, rangeEnd, rangeStart]);

  const monthRecords = useMemo(() => {
    if (!records.length) return [];

    const monthStartTime = currentMonth.getTime();
    const monthEndTime = addMonths(currentMonth, 1).getTime();

    return records.filter((record) => {
      const recordDate = new Date(record.date);
      if (Number.isNaN(recordDate.getTime())) return false;
      const time = recordDate.getTime();
      return time >= monthStartTime && time < monthEndTime;
    });
  }, [currentMonth, records]);

  const metrics = useMemo<AttendanceMetrics>(() => {
    if (!monthRecords.length)
      return { presentDays: 0, absentDays: 0, totalHours: 0, leaveDays: 0 };

    return monthRecords.reduce(
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
  }, [monthRecords]);

  const weeklyTrend = useMemo(() => {
    if (!records.length) return [];

    const buckets = new Map<
      string,
      {
        start: Date;
        presentDays: number;
        absenceDays: number;
      }
    >();

    for (const record of records) {
      const date = new Date(record.date);
      if (Number.isNaN(date.getTime())) continue;
      const weekStart = startOfWeek(date);
      const key = formatDateKey(weekStart);
      const bucket =
        buckets.get(key) ?? {
          start: weekStart,
          presentDays: 0,
          absenceDays: 0,
        };

      if (record.status === "present" || record.status === "partial") {
        bucket.presentDays += 1;
      }

      if (
        record.status === "absent" ||
        record.status === "sick" ||
        record.status === "holiday"
      ) {
        bucket.absenceDays += 1;
      }

      buckets.set(key, bucket);
    }

    const normalized: Array<{
      weekStart: string;
      rangeLabel: string;
      label: string;
      presentDays: number;
      absenceDays: number;
    }> = [];

    const start = startOfWeek(rangeStart);
    const end = startOfWeek(addDays(rangeEnd, -1));

    for (
      let cursor = new Date(start);
      cursor.getTime() <= end.getTime();
      cursor = addDays(cursor, 7)
    ) {
      const key = formatDateKey(cursor);
      const bucket = buckets.get(key);
      const weekEnd = addDays(cursor, 6);

      normalized.push({
        weekStart: key,
        rangeLabel: `${formatShortDate(cursor)} – ${formatShortDate(weekEnd)}`,
        label: formatShortDate(cursor),
        presentDays: bucket?.presentDays ?? 0,
        absenceDays: bucket?.absenceDays ?? 0,
      });
    }

    return normalized;
  }, [rangeEnd, rangeStart, records]);

  const monthLabel = monthFormatter.format(currentMonth);
  const chartData = useMemo(() => weeklyTrend.slice(-8), [weeklyTrend]);
  const latestWeek = chartData.at(-1);

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
        <div className="rounded-md border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">Weekly presence trend</p>
            {latestWeek && (
              <span className="text-xs text-muted-foreground">
                Last week: {latestWeek.presentDays} present · {latestWeek.absenceDays} away
              </span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="mt-4 h-48 w-full" />
          ) : chartData.length ? (
            <div className="mt-4">
              <ChartContainer
                config={attendanceChartConfig}
                className="h-48 w-full"
              >
                <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={24}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.rangeLabel ?? ""
                        }
                        formatter={(value: ValueType) => {
                          if (Array.isArray(value)) {
                            return `${value.join(", ")} days`;
                          }

                          return typeof value === "number"
                            ? `${value} days`
                            : value;
                        }}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="presentDays"
                    stroke="var(--color-presentDays)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="absenceDays"
                    stroke="var(--color-absenceDays)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No attendance activity for the selected period.
            </p>
          )}
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
              ) : monthRecords.length ? (
                monthRecords.map((record) => (
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
