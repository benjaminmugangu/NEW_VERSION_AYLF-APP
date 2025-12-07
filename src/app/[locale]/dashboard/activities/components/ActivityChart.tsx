// src/app/dashboard/activities/components/ActivityChart.tsx
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity, ActivityStatus } from "@/lib/types";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { useTranslations } from "next-intl";

interface ActivityChartProps {
  activities: Activity[];
  title: string;
  description?: string;
}

export function ActivityChart({ activities, title, description }: ActivityChartProps) {
  const tStatus = useTranslations('ActivityStatus');

  const chartConfig: ChartConfig = {
    planned: { label: tStatus("planned"), color: "hsl(var(--chart-2))" },
    in_progress: { label: tStatus("in_progress"), color: "hsl(var(--chart-3))" },
    delayed: { label: tStatus("delayed"), color: "hsl(var(--chart-4))" },
    executed: { label: tStatus("executed"), color: "hsl(var(--chart-1))" },
    canceled: { label: tStatus("canceled"), color: "hsl(var(--chart-5))" },
  };

  const processData = (data: Activity[]) => {
    const statusCounts = data.reduce(
      (acc, activity) => {
        acc[activity.status] = (acc[activity.status] || 0) + 1;
        return acc;
      },
      {} as Record<ActivityStatus, number>
    );

    return Object.keys(chartConfig).map(statusKey => {
      const key = statusKey as ActivityStatus;
      return {
        name: chartConfig[key].label,
        count: statusCounts[key] || 0,
        fill: chartConfig[key].color,
      };
    });
  };

  const chartData = processData(activities);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
