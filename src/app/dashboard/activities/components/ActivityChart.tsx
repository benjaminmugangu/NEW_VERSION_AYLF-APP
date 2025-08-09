// src/app/dashboard/activities/components/ActivityChart.tsx
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity, ActivityStatus } from "@/lib/types";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

interface ActivityChartProps {
  activities: Activity[];
  title: string;
  description?: string;
}

const chartConfigBase: ChartConfig = {
  PLANNED: { label: "Planned", color: "hsl(var(--chart-2))" },
  EXECUTED: { label: "Executed", color: "hsl(var(--chart-1))" },
  CANCELED: { label: "Canceled", color: "hsl(var(--chart-5))" },
};

export function ActivityChart({ activities, title, description }: ActivityChartProps) {
  const processData = (data: Activity[]) => {
    const statusCounts = data.reduce(
      (acc, activity) => {
        acc[activity.status] = (acc[activity.status] || 0) + 1;
        return acc;
      },
      {} as Record<ActivityStatus, number>
    );

    return [
      { name: "Planned", count: statusCounts.PLANNED || 0, fill: chartConfigBase.PLANNED.color },
      { name: "Executed", count: statusCounts.EXECUTED || 0, fill: chartConfigBase.EXECUTED.color },
      { name: "Canceled", count: statusCounts.CANCELED || 0, fill: chartConfigBase.CANCELED.color },
    ];
  };

  const chartData = processData(activities);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfigBase} className="h-[300px] w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="count" radius={5}>
                {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill as string} />
                ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
