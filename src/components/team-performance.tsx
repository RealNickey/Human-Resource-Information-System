"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { IconRefresh, IconTrendingUp } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LatestPerformance } from "@/lib/types";
import { createClient } from "@/lib/client";

type PerformanceSummary = {
  averageScore: number | null;
  reviewCount: number;
};

export function TeamPerformance() {
  const [summary, setSummary] = useState<PerformanceSummary>({
    averageScore: null,
    reviewCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadPerformance = useCallback(async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("latest_performance")
        .select("employee_id, overall_rating, performance_score");

      if (error) throw error;

      const evaluations = (data ?? []) as LatestPerformance[];
      if (!evaluations.length) {
        setSummary({ averageScore: null, reviewCount: 0 });
        return;
      }

      const validScores = evaluations
        .map(
          (evaluation) =>
            evaluation.overall_rating ?? evaluation.performance_score ?? null
        )
        .filter((score): score is number => score !== null);

      setSummary({
        averageScore: validScores.length
          ? validScores.reduce((total, score) => total + score, 0) /
            validScores.length
          : null,
        reviewCount: evaluations.length,
      });
    } catch (error) {
      console.error("Failed to load performance summary", error);
      setSummary({ averageScore: null, reviewCount: 0 });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const handleRefresh = () => {
    startTransition(async () => {
      await loadPerformance();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">
            Performance Snapshot
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest review count: {summary.reviewCount}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending || isRefreshing}
        >
          <IconRefresh className="mr-1 size-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">
            Average score (latest evaluations)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <IconTrendingUp className="size-5 text-emerald-600" />
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-semibold">
                {summary.averageScore !== null
                  ? summary.averageScore.toFixed(1)
                  : "—"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.averageScore !== null
              ? "Based on latest recorded performance reviews"
              : "No performance reviews available"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
