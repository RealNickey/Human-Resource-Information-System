"use client";

import { useEffect, useState } from "react";
import { IconUser } from "@tabler/icons-react";

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
import { Employee } from "@/lib/types";
import { createClient } from "@/lib/client";

interface TeamEmployeesProps {
  departmentId: number | null | undefined;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function TeamEmployees({ departmentId }: TeamEmployeesProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      if (!departmentId) {
        setEmployees([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .eq("department_id", departmentId)
          .order("last_name", { ascending: true });

        if (error) throw error;

        if (!cancelled) {
          setEmployees(data ?? []);
        }
      } catch (error) {
        console.error("Failed to load team employees", error);
        if (!cancelled) setEmployees([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
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
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEmployee(employee)}
                        >
                          <IconUser className="mr-1 size-4" />
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No team members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Employee ID</dt>
                  <dd className="mt-1 font-medium">{selectedEmployee.employee_id}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Email</dt>
                  <dd className="mt-1 font-medium">{selectedEmployee.email}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Position</dt>
                  <dd className="mt-1 font-medium">{selectedEmployee.position || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Date of Joining</dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(selectedEmployee.date_of_joining)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Phone</dt>
                  <dd className="mt-1 font-medium">{selectedEmployee.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Date of Birth</dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(selectedEmployee.date_of_birth)}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Address</dt>
                <dd className="mt-1 font-medium">{selectedEmployee.address || "—"}</dd>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    Emergency Contact Name
                  </dt>
                  <dd className="mt-1 font-medium">
                    {selectedEmployee.emergency_contact_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    Emergency Contact Phone
                  </dt>
                  <dd className="mt-1 font-medium">
                    {selectedEmployee.emergency_contact_phone || "—"}
                  </dd>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
