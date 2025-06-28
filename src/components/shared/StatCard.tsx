import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatCardData } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

export function StatCard({ title, value, icon: Icon, description, href }: StatCardData) {
  const cardContent = (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.02] h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-5 w-5 text-primary" />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
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
