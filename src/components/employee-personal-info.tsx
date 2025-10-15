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
      <CardContent className="space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Employment Details
          </h3>
          <dl className="grid gap-4 md:grid-cols-2">
            <InfoItem label="Employee ID" value={employee.employee_id} isMono />
            <InfoItem
              label="Department"
              value={employee.department?.name ?? "Not assigned"}
            />
            <InfoItem
              label="Position"
              value={employee.position || "Not specified"}
            />
            <InfoItem
              label="Date of Joining"
              value={formatDate(employee.date_of_joining)}
            />
            <InfoItem
              label="Date of Birth"
              value={formatDate(employee.date_of_birth)}
            />
            <InfoItem
              label="Annual Leave Remaining"
              value={
                typeof employee.annual_leave_remaining === "number"
                  ? `${employee.annual_leave_remaining} days`
                  : "—"
              }
            />
          </dl>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Contact Information
          </h3>
          <dl className="grid gap-4 md:grid-cols-2">
            <InfoItem label="Email" value={employee.email} />
            <InfoItem label="Phone" value={employee.phone || "Not provided"} />
            <InfoItem
              label="Address"
              value={employee.address || "Not provided"}
              className="md:col-span-2 whitespace-pre-line"
            />
          </dl>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Emergency Contact
          </h3>
          <dl className="grid gap-4 md:grid-cols-2">
            <InfoItem
              label="Name"
              value={employee.emergency_contact_name || "Not provided"}
            />
            <InfoItem
              label="Phone"
              value={employee.emergency_contact_phone || "Not provided"}
            />
          </dl>
        </section>
      </CardContent>
    </Card>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
  isMono?: boolean;
  className?: string;
}

function InfoItem({ label, value, isMono = false, className }: InfoItemProps) {
  return (
    <div className={className}>
      <dt className="text-xs uppercase text-muted-foreground tracking-wide">
        {label}
      </dt>
      <dd
        className={isMono ? "font-mono text-sm" : "text-sm text-foreground"}
      >
        {value || "—"}
      </dd>
    </div>
  );
}
