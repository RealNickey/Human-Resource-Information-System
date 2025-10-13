import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Employee } from "@/lib/types";

interface EmployeePersonalInfoProps {
  employee: Employee | null;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function EmployeePersonalInfo({ employee }: EmployeePersonalInfoProps) {
  if (!employee) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="space-y-2" key={index}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const initials = `${employee.first_name?.[0] ?? ""}${
    employee.last_name?.[0] ?? ""
  }`.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={`/avatars/${employee.employee_id}.jpg`}
              alt={employee.first_name}
            />
            <AvatarFallback>{initials || "EMP"}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-lg font-semibold">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="text-sm text-muted-foreground">Employee information</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-6 md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Employee ID</dt>
            <dd className="font-mono text-sm">{employee.employee_id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Department</dt>
            <dd className="text-sm">
              {employee.department?.name ?? "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Email</dt>
            <dd className="text-sm">{employee.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Date of Birth</dt>
            <dd className="text-sm">{formatDate(employee.date_of_birth)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Date of Joining</dt>
            <dd className="text-sm">{formatDate(employee.date_of_joining)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
