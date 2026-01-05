import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";
import { Line, LineChart, ResponsiveContainer } from "recharts";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  href?: string;
  trendData?: number[]; // Array of numbers for sparkline
  trend?: "up" | "down" | "neutral"; // Trend direction color
  variant?: "default" | "danger" | "warning" | "success";
}

export function StatCard({ title, value, icon: Icon, description, href, trendData, trend, variant = "default" }: StatCardProps) {
  // Glassmorphism classes for dark mode
  const glassClasses = "dark:bg-white/5 dark:backdrop-blur-md dark:border-white/10";

  const variantClasses = {
    default: "border-border/50 hover:border-primary/20 hover:bg-accent/5",
    danger: "border-red-500/50 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/30",
    warning: "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500 hover:bg-amber-100/50 dark:hover:bg-amber-900/30",
    success: "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-500 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30"
  };

  const cardContent = (
    <Card className={cn(
      "shadow-md hover:shadow-lg transition-all duration-300 ease-in-out hover:scale-[1.02] h-full border-2",
      variantClasses[variant],
      glassClasses
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn(
          "text-sm font-medium text-muted-foreground",
          variant === 'danger' && "text-red-600 dark:text-red-400"
        )}>
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-5 w-5 text-muted-foreground",
          variant === 'danger' && "text-red-500",
          variant === 'warning' && "text-amber-500",
          variant === 'success' && "text-emerald-500"
        )} />
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="text-3xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground pt-1">{description}</p>
            )}
          </div>

          {/* Sparkline Chart */}
          {trendData && trendData.length > 0 && (
            <div className="h-10 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.map((val, i) => ({ value: val, i }))}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={trend === 'down' ? '#ef4444' : (trend === 'up' ? '#10b981' : '#8884d8')}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
