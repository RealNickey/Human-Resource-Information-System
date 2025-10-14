"use client";

import { useEffect, useState, useTransition } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
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
import { LeaveRequest, LeaveStatus } from "@/lib/types";
import { createClient } from "@/lib/client";

interface ManagerLeaveRequestsProps {
  departmentId: number | null | undefined;
  managerId: number | null | undefined;
}

type LeaveRequestWithEmployee = LeaveRequest & {
  employee_name: string;
  employee_id_str: string;
};

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ManagerLeaveRequests({
  departmentId,
  managerId,
}: ManagerLeaveRequestsProps) {
  const [requests, setRequests] = useState<LeaveRequestWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadLeaveRequests = async () => {
    if (!departmentId) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data: employees } = await supabase
        .from("employees")
        .select("id, employee_id, first_name, last_name")
        .eq("department_id", departmentId);

      if (!employees || employees.length === 0) {
        setRequests([]);
        return;
      }

      const employeeMap = new Map(
        employees.map((e) => [
          e.id,
          { name: `${e.first_name} ${e.last_name}`, empId: e.employee_id },
        ])
      );
      const employeeIds = employees.map((e) => e.id);

      const { data: leaveData, error } = await supabase
        .from("leave_requests")
        .select("*")
        .in("employee_id", employeeIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const requestsWithNames: LeaveRequestWithEmployee[] =
        leaveData?.map((request) => {
          const empInfo = employeeMap.get(request.employee_id);
          return {
            ...request,
            employee_name: empInfo?.name || "Unknown",
            employee_id_str: empInfo?.empId || "—",
          };
        }) ?? [];
      setRequests(requestsWithNames);
    } catch (error) {
      console.error("Failed to load leave requests", error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await loadLeaveRequests();
    }

    if (!cancelled) {
      void load();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  const handleStatusUpdate = async (
    requestId: number,
    newStatus: LeaveStatus
  ) => {
    if (!managerId) {
      toast.error("Manager ID not found");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const updateData: {
          status: LeaveStatus;
          approved_by: number;
          approved_at: string;
          rejection_reason?: string | null;
        } = {
          status: newStatus,
          approved_by: managerId,
          approved_at: new Date().toISOString(),
        };

        if (newStatus === "rejected") {
          updateData.rejection_reason = "Rejected by manager";
        }

        const { error } = await supabase
          .from("leave_requests")
          .update(updateData)
          .eq("id", requestId);

        if (error) throw error;

        toast.success(
          `Leave request ${newStatus === "approved" ? "approved" : "rejected"}`
        );
        await loadLeaveRequests();
      } catch (error) {
        console.error("Failed to update leave request", error);
        toast.error("Failed to update leave request");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Leave Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
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
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
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
                    <TableCell className="font-medium">
                      {request.employee_id_str}
                    </TableCell>
                    <TableCell>{request.employee_name}</TableCell>
                    <TableCell>{formatDate(request.start_date)}</TableCell>
                    <TableCell>{formatDate(request.end_date)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.reason || "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          request.status === "approved"
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
                            : request.status === "rejected"
                            ? "bg-red-100 text-red-900 dark:bg-red-500/10 dark:text-red-200"
                            : "bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
                        }`}
                      >
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
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
                        <span className="text-sm text-muted-foreground">
                          {request.status === "approved"
                            ? "Approved"
                            : "Rejected"}
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
