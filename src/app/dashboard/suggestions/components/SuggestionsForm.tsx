// src/app/dashboard/suggestions/components/SuggestionsForm.tsx
"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { historicalDataExample, currentTrendsExample, groupPreferencesExample as baseGroupPreferencesExample } from "@/lib/mockData"; 
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/constants";

const suggestionsFormSchema = z.object({
  historicalData: z.string().min(50, "Please provide more detailed historical data (min 50 characters)."),
  currentTrends: z.string().min(50, "Please describe current trends in more detail (min 50 characters)."),
  groupPreferences: z.string().optional(),
});

export type SuggestionsFormData = z.infer<typeof suggestionsFormSchema>;

interface SuggestionsFormProps {
  onSubmit: (data: SuggestionsFormData) => Promise<void>;
  isLoading: boolean;
  currentUserRole?: Role;
  entityName?: string;
}

export function SuggestionsForm({ onSubmit, isLoading, currentUserRole, entityName }: SuggestionsFormProps) {
  
  const generateContextualGroupPreferences = () => {
    let contextualNote = "";
    if (currentUserRole === ROLES.SITE_COORDINATOR && entityName) {
      contextualNote = `\n\nThis request is specifically for the ${entityName} site. Please tailor suggestions considering its members, common activities, and local context.`;
    } else if (currentUserRole === ROLES.SMALL_GROUP_LEADER && entityName) {
      contextualNote = `\n\nThis request is for the ${entityName} small group. Focus on activities suitable for this specific group, its size, and typical interests.`;
    }
    return `${baseGroupPreferencesExample}${contextualNote}`;
  };
  
  const { control, handleSubmit, formState: { errors }, reset, setValue } = useForm<SuggestionsFormData>({
    resolver: zodResolver(suggestionsFormSchema),
    defaultValues: { // Set initial default values
      historicalData: historicalDataExample,
      currentTrends: currentTrendsExample,
      groupPreferences: generateContextualGroupPreferences(),
    }
  });

  // Update defaultValues if currentUserRole or entityName changes after initial render
  useEffect(() => {
    setValue("groupPreferences", generateContextualGroupPreferences());
  }, [currentUserRole, entityName, setValue]);


  const getGroupPreferencesLabel = () => {
    if (currentUserRole === ROLES.SITE_COORDINATOR && entityName) {
      return `Specific Preferences for ${entityName} (Optional)`;
    }
    if (currentUserRole === ROLES.SMALL_GROUP_LEADER && entityName) {
      return `Specific Preferences for ${entityName} (Optional)`;
    }
    return "Specific Group Preferences (Optional)";
  };
  
  const getGroupPreferencesPlaceholder = () => {
     if (currentUserRole === ROLES.SITE_COORDINATOR && entityName) {
      return `E.g., Age range of members in ${entityName}, particular interests, budget specific to this site...`;
    }
    if (currentUserRole === ROLES.SMALL_GROUP_LEADER && entityName) {
      return `E.g., Typical size of ${entityName}, core interests of members, specific goals for this group...`;
    }
    return "Any specific age ranges, interests, location constraints, budget limitations for groups you manage?";
  }


  return (
    <Card className="shadow-xl w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Lightbulb className="mr-3 h-7 w-7 text-primary" />
          Generate Activity Suggestions
        </CardTitle>
        <CardDescription>
          Provide context about past activities, current youth trends, and specific group preferences. 
          Our AI will then suggest relevant and engaging activities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="historicalData" className="font-semibold">Historical Activity Data</Label>
            <Controller
              name="historicalData"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="historicalData"
                  {...field}
                  placeholder="Describe past activities, attendance, feedback, resources used, etc."
                  rows={8}
                  className="mt-1 text-sm"
                />
              )}
            />
            {errors.historicalData && <p className="text-sm text-destructive mt-1">{errors.historicalData.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">Example: Annual conferences, workshops, community service, popular topics, attendance numbers.</p>
          </div>

          <div>
            <Label htmlFor="currentTrends" className="font-semibold">Current Youth Trends</Label>
            <Controller
              name="currentTrends"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="currentTrends"
                  {...field}
                  placeholder="What's popular now? New topics, successful events elsewhere, tech trends, etc."
                  rows={8}
                  className="mt-1 text-sm"
                />
              )}
            />
            {errors.currentTrends && <p className="text-sm text-destructive mt-1">{errors.currentTrends.message}</p>}
             <p className="text-xs text-muted-foreground mt-1">Example: Interest in mental health, short-form video, hybrid events, skill development like coding.</p>
          </div>

          <div>
            <Label htmlFor="groupPreferences" className="font-semibold">{getGroupPreferencesLabel()}</Label>
            <Controller
              name="groupPreferences"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="groupPreferences"
                  {...field}
                  placeholder={getGroupPreferencesPlaceholder()}
                  rows={5}
                  className="mt-1 text-sm"
                />
              )}
            />
            {errors.groupPreferences && <p className="text-sm text-destructive mt-1">{errors.groupPreferences.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">Example: Target age 15-25, interests in spiritual growth & tech, limited budget.</p>
          </div>

          <Button type="submit" className="w-full py-3 text-base" disabled={isLoading}>
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Suggestions...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-5 w-5" /> Get AI Suggestions
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

