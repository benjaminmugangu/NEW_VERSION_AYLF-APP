// src/app/dashboard/activities/components/ActivityChart.tsx
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/types";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

interface ActivityChartProps {
  activities: Activity[];
  title: string;
  description?: string;
}

const chartConfigBase: ChartConfig = {
  planned: { label: "Planned", color: "hsl(var(--chart-2))" }, // Blueish
  executed: { label: "Executed", color: "hsl(var(--chart-1))" }, // Teal
  cancelled: { label: "Cancelled", color: "hsl(var(--chart-5))" }, // Reddish
};

export function ActivityChart({ activities, title, description }: ActivityChartProps) {
  const processData = (data: Activity[]) => {
    const statusCounts = data.reduce(
      (acc, activity) => {
        acc[activity.status] = (acc[activity.status] || 0) + 1;
        return acc;
      },
      {} as Record<Activity["status"], number>
    );

    return [
      { name: "Planned", count: statusCounts.planned || 0, fill: chartConfigBase.planned.color },
      { name: "Executed", count: statusCounts.executed || 0, fill: chartConfigBase.executed.color },
      { name: "Cancelled", count: statusCounts.cancelled || 0, fill: chartConfigBase.cancelled.color },
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
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
