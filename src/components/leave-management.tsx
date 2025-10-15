"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  submitLeaveRequest,
  type LeaveRequestState,
} from "@/app/employee/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { LeaveRequest as LeaveRequestType } from "@/lib/types";
import { createClient } from "@/lib/client";
import { ANNUAL_LEAVE_ALLOWANCE } from "@/lib/constants";

type LeaveManagementProps = {
  employeeId: number | null | undefined;
  remainingLeave?: number;
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString();
};

export function LeaveManagement({
  employeeId,
  remainingLeave,
}: LeaveManagementProps) {
  const [recentRequests, setRecentRequests] = useState<LeaveRequestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<LeaveRequestState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const loadLeaveRequests = useCallback(async () => {
    if (!employeeId) {
      setRecentRequests([]);
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
        .gte("start_date", `${currentYear}-01-01`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentRequests(data ?? []);
    } catch (error) {
      console.error("Failed to load leave requests", error);
      setRecentRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      await loadLeaveRequests();
      if (!cancelled) setIsLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadLeaveRequests]);

  const leaveSummary = useMemo(() => {
    if (!employeeId) {
      return {
        approvedDays: 0,
        pendingCount: 0,
        nextLeave: undefined as string | undefined,
        remainingBalance: remainingLeave ?? 0,
      };
    }

    const approvedDays = recentRequests
      .filter((request) => request.status === "approved")
      .reduce((total, request) => total + request.days_requested, 0);

    const pendingCount = recentRequests.filter(
      (request) => request.status === "pending"
    ).length;

    const today = new Date().setHours(0, 0, 0, 0);
    const upcoming = recentRequests
      .filter((request) => {
        const start = new Date(request.start_date).setHours(0, 0, 0, 0);
        return start >= today && request.status !== "rejected";
      })
      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )[0];

    const fallbackRemaining = Math.max(
      ANNUAL_LEAVE_ALLOWANCE - approvedDays,
      0
    );

    return {
      approvedDays,
      pendingCount,
      nextLeave: upcoming ? upcoming.start_date : undefined,
      remainingBalance: remainingLeave ?? fallbackRemaining,
    };
  }, [employeeId, recentRequests, remainingLeave]);

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await submitLeaveRequest(state, formData);
      setState(result);
      if (result.status === "success") {
        await loadLeaveRequests();
      }
    });
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Leave Management
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-md border bg-card p-3"
                aria-hidden
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-6 w-16" />
              </div>
            ))
          ) : (
            <>
              <SummaryStat
                label="Approved days this year"
                value={`${leaveSummary.approvedDays}`}
              />
              <SummaryStat
                label="Pending requests"
                value={`${leaveSummary.pendingCount}`}
              />
              <SummaryStat
                label="Remaining leave"
                value={`${leaveSummary.remainingBalance}`}
              />
              <SummaryStat
                label="Next scheduled leave"
                value={
                  leaveSummary.nextLeave
                    ? formatDate(leaveSummary.nextLeave)
                    : "None scheduled"
                }
              />
            </>
          )}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-32">Start</TableHead>
                <TableHead className="w-32">End</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-24 text-right">Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : recentRequests.length ? (
                recentRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{formatDate(request.start_date)}</TableCell>
                    <TableCell>{formatDate(request.end_date)}</TableCell>
                    <TableCell className="capitalize">
                      {request.leave_type.replace("-", " ")}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.days_requested}
                    </TableCell>
                    <TableCell>
                      <LeaveStatusBadge status={request.status} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No leave requests this year.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <form
          className="grid w-full gap-4 text-sm sm:grid-cols-4"
          action={handleAction}
        >
          <input type="hidden" name="employee_id" value={employeeId ?? ""} />
          <div className="sm:col-span-2">
            <Label htmlFor="leave_type">Leave type</Label>
            <Select name="leave_type" defaultValue="vacation" required>
              <SelectTrigger id="leave_type">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="maternity">Maternity</SelectItem>
                <SelectItem value="paternity">Paternity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" name="start_date" type="date" required />
          </div>
          <div>
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" name="end_date" type="date" required />
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" placeholder="Optional" />
          </div>
          <div className="flex items-center justify-between sm:col-span-4">
            <p className="text-xs text-muted-foreground">
              Remaining balance: {leaveSummary.remainingBalance} days{" "}
              {state.status === "error" && (
                <span className="text-red-500">{state.message}</span>
              )}
              {state.status === "success" && (
                <span className="text-emerald-600">{state.message}</span>
              )}
            </p>
            <Button type="submit" disabled={!employeeId || isPending}>
              Request time off
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}

type LeaveStatusBadgeProps = {
  status: LeaveRequestType["status"];
};

const statusStyles: Record<LeaveStatusBadgeProps["status"], string> = {
  pending:
    "bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200",
};

function LeaveStatusBadge({ status }: LeaveStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

type SummaryStatProps = {
  label: string;
  value: string;
};

function SummaryStat({ label, value }: SummaryStatProps) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
