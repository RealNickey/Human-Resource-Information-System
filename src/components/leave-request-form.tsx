"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { IconCalendarPlus, IconClockCheck } from "@tabler/icons-react";

import {
  submitLeaveRequest,
  type LeaveRequestState,
} from "@/app/employee/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { LeaveRequest as LeaveRequestType } from "@/lib/types";
import { createClient } from "@/lib/client";
import { ANNUAL_LEAVE_ALLOWANCE } from "@/lib/constants";

type LeaveRequestFormProps = {
  employeeId: number | null | undefined;
  remainingLeave?: number;
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

const statusStyles: Record<LeaveRequestType["status"], string> = {
  pending:
    "bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200",
};

export function LeaveRequestForm({
  employeeId,
  remainingLeave,
}: LeaveRequestFormProps) {
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
        .in("status", ["pending", "rejected"]) // Only show pending and rejected requests
        .order("created_at", { ascending: false })
        .limit(5);

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
        pendingCount: 0,
        rejectedCount: 0,
        remainingBalance: remainingLeave ?? 0,
      };
    }

    const pendingCount = recentRequests.filter(
      (request) => request.status === "pending"
    ).length;

    const rejectedCount = recentRequests.filter(
      (request) => request.status === "rejected"
    ).length;

    return {
      pendingCount,
      rejectedCount,
      remainingBalance: remainingLeave ?? ANNUAL_LEAVE_ALLOWANCE,
    };
  }, [employeeId, recentRequests, remainingLeave]);

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await submitLeaveRequest(state, formData);
      setState(result);
      if (result.status === "success") {
        await loadLeaveRequests();
        // Clear form
        const form = document.querySelector("form") as HTMLFormElement;
        if (form) {
          form.reset();
        }
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IconCalendarPlus className="size-4" />
              Request Time Off
            </CardTitle>
            <CardDescription className="mt-1">
              Submit a leave request for manager approval
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase">
                Available Leave
              </p>
              <p className="text-2xl font-bold text-foreground">
                {leaveSummary.remainingBalance}
              </p>
              <p className="text-xs text-muted-foreground">days remaining</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Request Form */}
        <form className="space-y-4" action={handleAction}>
          <input type="hidden" name="employee_id" value={employeeId ?? ""} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="leave_type">Leave Type</Label>
              <Select name="leave_type" defaultValue="vacation" required>
                <SelectTrigger id="leave_type">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">🏖️ Vacation</SelectItem>
                  <SelectItem value="sick">🤒 Sick Leave</SelectItem>
                  <SelectItem value="personal">👤 Personal Leave</SelectItem>
                  <SelectItem value="emergency">🚨 Emergency Leave</SelectItem>
                  <SelectItem value="maternity">👶 Maternity Leave</SelectItem>
                  <SelectItem value="paternity">🍼 Paternity Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">From Date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <Label htmlFor="end_date">To Date</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Provide additional context for your leave request..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm">
              {state.status === "error" && (
                <p className="text-rose-600 font-medium">⚠️ {state.message}</p>
              )}
              {state.status === "success" && (
                <p className="text-emerald-600 font-medium">
                  ✓ {state.message}
                </p>
              )}
              {state.status === "idle" && !isPending && (
                <p className="text-muted-foreground">
                  Requests are subject to manager approval
                </p>
              )}
              {isPending && (
                <p className="text-muted-foreground">Submitting request...</p>
              )}
            </div>
            <Button type="submit" disabled={!employeeId || isPending}>
              {isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>

        {/* Pending & Rejected Requests */}
        {(leaveSummary.pendingCount > 0 || leaveSummary.rejectedCount > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                <IconClockCheck className="size-4" />
                Recent Requests
              </h3>
              <div className="flex items-center gap-2">
                {leaveSummary.pendingCount > 0 && (
                  <Badge variant="secondary" className={statusStyles.pending}>
                    {leaveSummary.pendingCount} Pending
                  </Badge>
                )}
                {leaveSummary.rejectedCount > 0 && (
                  <Badge variant="secondary" className={statusStyles.rejected}>
                    {leaveSummary.rejectedCount} Rejected
                  </Badge>
                )}
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-4 w-8" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : recentRequests.length > 0 ? (
                    recentRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {formatDate(request.start_date)} –{" "}
                          {formatDate(request.end_date)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {request.leave_type.replace("-", " ")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {request.days_requested}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={statusStyles[request.status]}
                          >
                            {request.status === "pending" && "⏳ "}
                            {request.status === "rejected" && "✗ "}
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
