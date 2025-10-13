import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
            {employee.position && (
              <p className="text-sm text-muted-foreground">
                {employee.position}
              </p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Employee ID
              </p>
              <p className="font-mono text-sm">{employee.employee_id}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Email</p>
              <p className="text-sm">{employee.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Department
              </p>
              <Badge variant="secondary">
                {employee.department?.name ?? "Unassigned"}
              </Badge>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Date of Birth
              </p>
              <p className="text-sm">{formatDate(employee.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Date of Joining
              </p>
              <p className="text-sm">{formatDate(employee.date_of_joining)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Phone</p>
              <p className="text-sm">{employee.phone || "Not provided"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
