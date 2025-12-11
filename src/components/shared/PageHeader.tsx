import type { LucideIcon } from "lucide-react";
import React from "react";

interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: LucideIcon;
  readonly actions?: React.ReactNode;
}

import { Breadcrumbs } from "./Breadcrumbs";

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 md:mb-8">
      <Breadcrumbs />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-1 min-w-0 items-center gap-3"> {/* Added flex-1 min-w-0 */}
          {Icon && <Icon className="h-8 w-8 text-primary shrink-0" />} {/* Added shrink-0 to prevent icon from shrinking */}
          <div className="min-w-0"> {/* Added wrapper for title/desc for proper min-w-0 application */}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground md:truncate">{title}</h1> {/* Added md:truncate as safety */}
            {description && <p className="text-sm md:text-base text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0 md:ml-auto shrink-0">{actions}</div>} {/* Added shrink-0 to prevent actions container from shrinking */}
      </div>
    </div>
  );
}
