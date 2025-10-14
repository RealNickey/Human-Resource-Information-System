import {
  IconCalendarMinus,
  IconCalendarStats,
  IconCurrencyDollar,
  IconUmbrella,
} from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type EmployeeDashboardSummaryData = {
  daysWorkedThisMonth: number;
  leaveDaysTakenThisYear: number;
  leavesRemaining: number;
  nextPaydayLabel: string;
};

interface EmployeeDashboardSummaryProps {
  data: EmployeeDashboardSummaryData | null;
  isLoading?: boolean;
}

const summaryItemsConfig = [
  {
    key: "daysWorkedThisMonth" as const,
    label: "Days worked this month",
    icon: <IconCalendarStats className="size-4 text-muted-foreground" />,
  },
  {
    key: "leaveDaysTakenThisYear" as const,
    label: "Leave days taken (YTD)",
    icon: <IconCalendarMinus className="size-4 text-muted-foreground" />,
  },
  {
    key: "leavesRemaining" as const,
    label: "Leaves left",
    icon: <IconUmbrella className="size-4 text-muted-foreground" />,
  },
  {
    key: "nextPaydayLabel" as const,
    label: "Next payday",
    icon: <IconCurrencyDollar className="size-4 text-muted-foreground" />,
  },
];

export function EmployeeDashboardSummary({ data, isLoading }: EmployeeDashboardSummaryProps) {
  return (
    <section aria-label="Employee dashboard summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryItemsConfig.map(({ key, label, icon }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            {icon}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : data ? (
              <p className="text-2xl font-semibold text-foreground">
                {key === "nextPaydayLabel" ? data[key] : data[key].toString()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Summary unavailable</p>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
