// src/app/dashboard/suggestions/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SuggestionsForm, type SuggestionsFormData } from "./components/SuggestionsForm";
import { SuggestionsDisplay } from "./components/SuggestionsDisplay";
import { getSuggestedActivitiesAction } from "./actions";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { SuggestActivitiesOutput } from "@/ai/flows/suggest-activities";
import { Lightbulb } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mockSites, mockSmallGroups } from "@/lib/mockData";

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<SuggestActivitiesOutput | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const entityName = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === ROLES.SITE_COORDINATOR && currentUser.siteId) {
      return mockSites.find(s => s.id === currentUser.siteId)?.name || null;
    }
    if (currentUser.role === ROLES.SMALL_GROUP_LEADER && currentUser.smallGroupId) {
      const sg = mockSmallGroups.find(s => s.id === currentUser.smallGroupId);
      if (sg) {
        const site = mockSites.find(s => s.id === sg.siteId);
        return `${sg.name}${site ? ` (${site.name})` : ''}`;
      }
      return null;
    }
    return null;
  }, [currentUser]);

  const pageDescription = useMemo(() => {
    let base = "Leverage AI to discover new and engaging activity ideas";
    if (entityName) {
      return `${base} for ${entityName}.`;
    }
    if (currentUser?.role === ROLES.NATIONAL_COORDINATOR) {
      return `${base} for various groups nationwide.`;
    }
    return `${base}.`;
  }, [entityName, currentUser?.role]);


  const handleFormSubmit = async (data: SuggestionsFormData) => {
    setIsLoading(true);
    setError(undefined);
    setSuggestions(undefined);

    try {
      // The action now receives the raw form data.
      // The flow itself can be designed to interpret contextual cues if present in the string fields.
      const result = await getSuggestedActivitiesAction(data);
      if (result.success && result.data) {
        setSuggestions(result.data);
        toast({
          title: "Suggestions Generated!",
          description: "AI has provided new activity ideas.",
        });
      } else {
        setError(result.error || "An unknown error occurred.");
        toast({
          title: "Error Generating Suggestions",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(errorMessage);
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="AI Activity Suggestions"
        description={pageDescription}
        icon={Lightbulb}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
          <SuggestionsForm 
            onSubmit={handleFormSubmit} 
            isLoading={isLoading}
            currentUserRole={currentUser?.role}
            entityName={entityName || undefined}
          />
        </div>
        <div className="lg:sticky lg:top-24"> {/* Make display sticky on larger screens */}
          <SuggestionsDisplay 
            suggestions={suggestions} 
            error={error} 
            entityName={entityName || undefined}
            currentUserRole={currentUser?.role}
          />
        </div>
      </div>
    </RoleBasedGuard>
  );
}

