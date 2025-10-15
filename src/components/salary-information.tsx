"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconTrendingDown,
  IconTrendingUp,
  IconCurrencyDollar,
} from "@tabler/icons-react";

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
import { PerformanceEvaluation, SalaryRecord } from "@/lib/types";
import { createClient } from "@/lib/client";

interface SalaryInformationProps {
  employeeId: number | null | undefined;
}

type SalaryViewModel = {
  currentSalary?: SalaryRecord;
  previousSalary?: SalaryRecord;
  differenceLabel: string;
  differenceValue: number;
  direction: "up" | "down" | "flat";
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function SalaryInformation({ employeeId }: SalaryInformationProps) {
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);
  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSalary() {
      if (!employeeId) {
        setSalaryHistory([]);
        setEvaluations([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();
        const [
          { data: salaries, error: salaryError },
          { data: reviews, error: reviewError },
        ] = await Promise.all([
          supabase
            .from("salary_records")
            .select("*")
            .eq("employee_id", employeeId)
            .order("effective_date", { ascending: false })
            .limit(5),
          supabase
            .from("performance_evaluations")
            .select("*")
            .eq("employee_id", employeeId)
            .order("evaluation_period_end", { ascending: false })
            .limit(3),
        ]);

        if (salaryError) throw salaryError;
        if (reviewError) throw reviewError;

        if (!cancelled) {
          setSalaryHistory(salaries ?? []);
          setEvaluations(reviews ?? []);
        }
      } catch (error) {
        console.error("Failed to load salary information", error);
        if (!cancelled) {
          setSalaryHistory([]);
          setEvaluations([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSalary();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const viewModel = useMemo<SalaryViewModel>(() => {
    if (!salaryHistory.length) {
      return {
        differenceLabel: "No salary data",
        differenceValue: 0,
        direction: "flat",
      };
    }

    const [current, previous] = salaryHistory;

    if (!previous) {
      return {
        currentSalary: current,
        differenceLabel: "Initial salary",
        differenceValue: current.base_salary,
        direction: "up",
      };
    }

    const diff = current.base_salary - previous.base_salary;

    return {
      currentSalary: current,
      previousSalary: previous,
      differenceLabel:
        diff === 0
          ? "No change since last review"
          : diff > 0
          ? "Increment applied"
          : "Decrement applied",
      differenceValue: Math.abs(diff),
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
    };
  }, [salaryHistory]);

  const directionIcon = {
    up: <IconTrendingUp className="size-4 text-emerald-600" />,
    down: <IconTrendingDown className="size-4 text-rose-600" />,
    flat: <IconCurrencyDollar className="size-4 text-muted-foreground" />,
  }[viewModel.direction];

  const directionColor = {
    up: "text-emerald-600",
    down: "text-rose-600",
    flat: "text-muted-foreground",
  }[viewModel.direction];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Salary Overview
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Your salary is adjusted based on performance evaluations and company policies
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Current salary
            </p>
            <div className="mt-2 flex items-center gap-2">
              {isLoading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <span className="text-xl font-semibold">
                  {viewModel.currentSalary
                    ? currencyFormatter.format(
                        viewModel.currentSalary.base_salary
                      )
                    : "—"}
                </span>
              )}
            </div>
            {viewModel.currentSalary && (
              <p className="text-xs text-muted-foreground">
                Effective {formatDate(viewModel.currentSalary.effective_date)}
              </p>
            )}
          </div>
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Change</p>
            <div className="mt-2 flex items-center gap-2">
              {directionIcon}
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <span className={`text-xl font-semibold ${directionColor}`}>
                  {currencyFormatter.format(viewModel.differenceValue)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {viewModel.differenceLabel}
            </p>
          </div>
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Last evaluation
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : evaluations.length ? (
              <div className="mt-2 space-y-1">
                <p className="text-xl font-semibold">
                  {evaluations[0].overall_rating.toFixed(1)}/5
                  {evaluations[0].overall_rating >= 4.0 && " ⭐"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(evaluations[0].evaluation_period_start)} –{" "}
                  {formatDate(evaluations[0].evaluation_period_end)}
                </p>
                {evaluations[0].salary_adjustment_percentage !== null &&
                  evaluations[0].salary_adjustment_percentage !== undefined && (
                    <p className="text-xs font-medium text-emerald-600">
                      +{evaluations[0].salary_adjustment_percentage}% adjustment
                    </p>
                  )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No evaluations recorded.
              </p>
            )}
          </div>
        </div>

        {/* Performance Impact on Salary */}
        {evaluations.length > 0 && (
          <div className="rounded-md border bg-muted/20 p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              📈 Performance Impact
            </h3>
            <div className="space-y-3">
              {evaluations.slice(0, 2).map((evaluation, index) => (
                <div
                  key={evaluation.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {formatDate(evaluation.evaluation_period_end)} Evaluation
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rating: {evaluation.overall_rating.toFixed(1)}/5.0
                      {evaluation.performance_score && (
                        <> • Score: {evaluation.performance_score}</>
                      )}
                      {evaluation.goals_achieved !== null &&
                        evaluation.total_goals !== null && (
                          <>
                            {" "}
                            • Goals: {evaluation.goals_achieved}/
                            {evaluation.total_goals}
                          </>
                        )}
                    </p>
                  </div>
                  <div className="text-right">
                    {evaluation.salary_adjustment_percentage !== null &&
                    evaluation.salary_adjustment_percentage !== undefined ? (
                      <p
                        className={`font-semibold ${
                          evaluation.salary_adjustment_percentage > 0
                            ? "text-emerald-600"
                            : evaluation.salary_adjustment_percentage < 0
                            ? "text-rose-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {evaluation.salary_adjustment_percentage > 0 && "+"}
                        {evaluation.salary_adjustment_percentage}%
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No adjustment
                      </p>
                    )}
                    {evaluation.bonus_amount !== null &&
                      evaluation.bonus_amount !== undefined &&
                      evaluation.bonus_amount > 0 && (
                        <p className="text-xs text-emerald-600 font-medium">
                          Bonus: {currencyFormatter.format(evaluation.bonus_amount)}
                        </p>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs uppercase text-muted-foreground">
            Salary history
          </p>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Effective date</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : salaryHistory.length ? (
                  salaryHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.effective_date)}</TableCell>
                      <TableCell>
                        {currencyFormatter.format(record.base_salary)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {record.salary_type}
                      </TableCell>
                      <TableCell>{record.currency}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No salary records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}
