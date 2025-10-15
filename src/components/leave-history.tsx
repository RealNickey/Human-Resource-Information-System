"use client";

import { useEffect, useState, useMemo } from "react";
import { IconCalendarEvent, IconClockHour4 } from "@tabler/icons-react";

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
import { Badge } from "@/components/ui/badge";
import type { LeaveRequest } from "@/lib/types";
import { createClient } from "@/lib/client";

type LeaveHistoryProps = {
  employeeId: number | null | undefined;
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }

  if (start === end) {
    return formatDate(start);
  }

  return `${formatDate(start)} – ${formatDate(end)}`;
};

const leaveTypeLabels: Record<LeaveRequest["leave_type"], string> = {
  vacation: "Vacation",
  sick: "Sick Leave",
  personal: "Personal Leave",
  emergency: "Emergency Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
};

const leaveTypeColors: Record<LeaveRequest["leave_type"], string> = {
  vacation: "bg-blue-100 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200",
  sick: "bg-rose-100 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200",
  personal: "bg-purple-100 text-purple-900 dark:bg-purple-500/10 dark:text-purple-200",
  emergency: "bg-orange-100 text-orange-900 dark:bg-orange-500/10 dark:text-orange-200",
  maternity: "bg-pink-100 text-pink-900 dark:bg-pink-500/10 dark:text-pink-200",
  paternity: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200",
};

export function LeaveHistory({ employeeId }: LeaveHistoryProps) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaveHistory() {
      if (!employeeId) {
        setLeaveRequests([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const supabase = createClient();
        const currentYear = new Date().getFullYear();

        const { data, error } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("status", "approved") // Only show approved leaves
          .gte("start_date", `${currentYear}-01-01`)
          .order("start_date", { ascending: false });

        if (error) throw error;

        if (!cancelled) {
          setLeaveRequests(data ?? []);
        }
      } catch (error) {
        console.error("Failed to load leave history", error);
        if (!cancelled) {
          setLeaveRequests([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLeaveHistory();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const { totalDaysTaken, upcomingLeave, pastLeave } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const upcoming: LeaveRequest[] = [];
    const past: LeaveRequest[] = [];
    let totalDays = 0;

    for (const leave of leaveRequests) {
      totalDays += leave.days_requested;
      const endDate = new Date(leave.end_date);
      endDate.setHours(0, 0, 0, 0);

      if (endDate.getTime() >= todayTime) {
        upcoming.push(leave);
      } else {
        past.push(leave);
      }
    }

    return {
      totalDaysTaken: totalDays,
      upcomingLeave: upcoming,
      pastLeave: past,
    };
  }, [leaveRequests]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <IconCalendarEvent className="size-4" />
            Leave History
          </CardTitle>
          {!isLoading && (
            <Badge variant="secondary" className="font-mono">
              {totalDaysTaken} days taken this year
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upcoming Leave Section */}
        {!isLoading && upcomingLeave.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <IconClockHour4 className="size-4" />
              Upcoming & Current Leave
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingLeave.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {formatDateRange(leave.start_date, leave.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={leaveTypeColors[leave.leave_type]}
                        >
                          {leaveTypeLabels[leave.leave_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {leave.days_requested}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Past Leave Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase mb-3">
            {upcomingLeave.length > 0 ? "Past Leave" : "Leave Taken This Year"}
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Dates</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  {pastLeave.some((l) => l.reason) && (
                    <TableHead>Reason</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-4 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : pastLeave.length > 0 ? (
                  pastLeave.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {formatDateRange(leave.start_date, leave.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={leaveTypeColors[leave.leave_type]}
                        >
                          {leaveTypeLabels[leave.leave_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {leave.days_requested}
                      </TableCell>
                      {pastLeave.some((l) => l.reason) && (
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {leave.reason || "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No approved leave taken this year.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {!isLoading && leaveRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <IconCalendarEvent className="size-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">
              No leave history yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Approved leave requests will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
