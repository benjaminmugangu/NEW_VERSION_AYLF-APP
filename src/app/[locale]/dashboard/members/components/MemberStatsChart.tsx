// src/app/dashboard/members/components/MemberStatsChart.tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Member } from "@/lib/types";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface MemberStatsChartProps {
  members: Member[];
  title: string;
  description?: string;
}

const chartConfigBase: ChartConfig = {
  student: { label: "Students", color: "hsl(var(--chart-1))" }, // Teal
  "non-student": { label: "Non-Students", color: "hsl(var(--chart-4))" }, // Yellow/Orange
};


export function MemberStatsChart({ members, title, description }: MemberStatsChartProps) {
  const processData = (data: Member[]) => {
    const typeCounts = data.reduce(
      (acc, member) => {
        acc[member.type] = (acc[member.type] || 0) + 1;
        return acc;
      },
      {} as Record<Member["type"], number>
    );
    
    return [
        { name: "Students", value: typeCounts.student || 0, fill: chartConfigBase.student.color },
        { name: "Non-Students", value: typeCounts["non-student"] || 0, fill: chartConfigBase["non-student"].color },
    ];
  };

  const chartData = processData(members);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfigBase} className="h-[300px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
              }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
