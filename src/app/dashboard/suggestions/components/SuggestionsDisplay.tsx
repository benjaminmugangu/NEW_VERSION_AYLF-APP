// src/app/dashboard/suggestions/components/SuggestionsDisplay.tsx
"use client";

import type { SuggestActivitiesOutput } from "@/ai/flows/suggest-activities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/constants";

interface SuggestionsDisplayProps {
  suggestions?: SuggestActivitiesOutput;
  error?: string;
  entityName?: string;
  currentUserRole?: Role;
}

export function SuggestionsDisplay({ suggestions, error, entityName, currentUserRole }: SuggestionsDisplayProps) {
  if (error) {
    return (
      <Card className="mt-8 border-destructive bg-destructive/10 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive text-xl">
            <AlertTriangle className="mr-3 h-7 w-7" />
            Error Generating Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">Please check your input or try again later.</p>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) {
    let initialMessage = "Fill out the form above with details about your groups and past activities. Our AI will then generate tailored suggestions to inspire your next event!";
    if (currentUserRole === ROLES.SITE_COORDINATOR && entityName) {
        initialMessage = `Fill out the form above with details about ${entityName}, its members, and past activities. Our AI will then generate tailored suggestions to inspire your next event for ${entityName}!`;
    } else if (currentUserRole === ROLES.SMALL_GROUP_LEADER && entityName) {
        initialMessage = `Fill out the form above with details specific to ${entityName}, its members, and past activities. Our AI will then generate tailored suggestions to inspire your next event for ${entityName}!`;
    }

    return (
       <Card className="mt-8 border-dashed border-primary/50 bg-primary/5 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-primary text-xl">
            <Info className="mr-3 h-7 w-7" />
            Ready for Ideas?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {initialMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-xl bg-gradient-to-br from-card to-secondary/30">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl text-primary">
          <CheckCircle className="mr-3 h-8 w-8" />
          AI Generated Activity Suggestions
        </CardTitle>
        <CardDescription>Based on your input, here are some ideas for upcoming activities{entityName ? ` for ${entityName}` : ''}:</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Suggested Activities:</h3>
          {suggestions.suggestedActivities.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 pl-2">
              {suggestions.suggestedActivities.map((activity, index) => (
                <li key={index} className="text-foreground text-base leading-relaxed">
                  <span className="font-medium">{activity.split(':')[0]}:</span>
                  {activity.split(':').length > 1 ? activity.substring(activity.indexOf(':') + 1).trim() : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No specific activities suggested based on the input. Try refining your criteria.</p>
          )}
        </div>
        
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2 text-foreground">Reasoning:</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/50 p-4 rounded-md">
            {suggestions.reasoning}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

