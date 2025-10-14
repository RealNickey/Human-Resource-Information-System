"use client";

import { useEffect, useState } from "react";
import { IconTrendingUp } from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/client";

interface TeamPerformanceProps {
  departmentId: number | null | undefined;
}

export function TeamPerformance({ departmentId }: TeamPerformanceProps) {
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPerformance() {
      if (!departmentId) {
        setAvgScore(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split("T")[0];

        const { data: employees } = await supabase
          .from("employees")
          .select("id")
          .eq("department_id", departmentId);

        if (!employees || employees.length === 0) {
          if (!cancelled) setAvgScore(null);
          return;
        }

        const employeeIds = employees.map((e) => e.id);

        const { data: evaluations } = await supabase
          .from("performance_evaluations")
          .select("performance_score")
          .in("employee_id", employeeIds)
          .gte("evaluation_period_end", weekAgoStr);

        if (!cancelled) {
          if (evaluations && evaluations.length > 0) {
            const scores = evaluations
              .map((e) => e.performance_score)
              .filter((s): s is number => s !== null);
            const avg =
              scores.length > 0
                ? scores.reduce((sum, score) => sum + score, 0) / scores.length
                : null;
            setAvgScore(avg);
          } else {
            setAvgScore(null);
          }
        }
      } catch (error) {
        console.error("Failed to load team performance", error);
        if (!cancelled) setAvgScore(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadPerformance();

    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">
            Average weekly performance score
          </p>
          <div className="mt-2 flex items-center gap-2">
            <IconTrendingUp className="size-5 text-emerald-600" />
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-semibold">
                {avgScore !== null ? avgScore.toFixed(1) : "—"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {avgScore !== null ? "Last 7 days" : "No recent evaluations"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
