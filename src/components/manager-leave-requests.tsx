"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { IconCheck, IconRefresh, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

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
import type { LeaveRequest, LeaveStatus } from "@/lib/types";
import { createClient } from "@/lib/client";

interface ManagerLeaveRequestsProps {
  managerId: number | null | undefined;
}

type LeaveRequestWithEmployee = LeaveRequest & {
  employee_name: string;
  employee_code: string;
  remaining_leave: number;
};

const STATUS_STYLES: Record<LeaveStatus, string> = {
  approved:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-500/10 dark:text-red-200",
  pending:
    "bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200",
};

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ManagerLeaveRequests({ managerId }: ManagerLeaveRequestsProps) {
  const [requests, setRequests] = useState<LeaveRequestWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select(
          "id, employee_id, first_name, last_name, annual_leave_remaining"
        )
        .order("last_name", { ascending: true });

      if (employeesError) throw employeesError;

      const employeeMap = new Map(
        (employees ?? []).map((employee) => [
          employee.id,
          {
            name: `${employee.first_name} ${employee.last_name}`,
            code: employee.employee_id,
            remaining: employee.annual_leave_remaining ?? 0,
          },
        ])
      );

      const { data: leaveData, error: leaveError } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (leaveError) throw leaveError;

      const mapped = (leaveData ?? []).map((request) => {
        const employeeDetails = employeeMap.get(request.employee_id);
        return {
          ...request,
          employee_name: employeeDetails?.name ?? "Unknown",
          employee_code: employeeDetails?.code ?? "—",
          remaining_leave: employeeDetails?.remaining ?? 0,
        };
      });

      setRequests(mapped);
    } catch (error) {
      console.error("Failed to load leave requests", error);
      setRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaveRequests();
  }, [loadLeaveRequests]);

  const handleStatusUpdate = (requestId: number, nextStatus: LeaveStatus) => {
    if (!managerId) {
      toast.error("Manager profile not found.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();

        if (nextStatus === "approved") {
          const { error } = await supabase.rpc("approve_leave", {
            p_leave_id: requestId,
            p_approver_employee_id: managerId,
          });
          if (error) throw error;
        } else if (nextStatus === "rejected") {
          const { error } = await supabase.rpc("reject_leave", {
            p_leave_id: requestId,
            p_approver_employee_id: managerId,
          });
          if (error) throw error;
        }

        toast.success(`Leave request ${nextStatus}.`);
        await loadLeaveRequests();
      } catch (error) {
        console.error("Failed to update leave request", error);
        toast.error("Unable to update leave request.");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Leave Requests
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadLeaveRequests()}
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
                <TableHead>Employee</TableHead>
                <TableHead>Remaining Leave</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-8 w-32" />
                    </TableCell>
                  </TableRow>
                ))
              ) : requests.length ? (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {request.employee_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {request.employee_code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{request.remaining_leave}</TableCell>
                    <TableCell>{formatDate(request.start_date)}</TableCell>
                    <TableCell>{formatDate(request.end_date)}</TableCell>
                    <TableCell>{request.days_requested}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          STATUS_STYLES[request.status]
                        }`}
                      >
                        {request.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(request.id, "approved")
                            }
                            disabled={isPending}
                          >
                            <IconCheck className="mr-1 size-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(request.id, "rejected")
                            }
                            disabled={isPending}
                          >
                            <IconX className="mr-1 size-4" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground capitalize">
                          {request.status}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No leave requests found.
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
