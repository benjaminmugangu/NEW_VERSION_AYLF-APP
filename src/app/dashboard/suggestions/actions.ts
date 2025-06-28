// src/app/dashboard/suggestions/actions.ts
"use server";

import { suggestActivities as suggestActivitiesFlow, type SuggestActivitiesInput, type SuggestActivitiesOutput } from "@/ai/flows/suggest-activities";
import { z } from "zod";

const SuggestActivitiesServerInputSchema = z.object({
  historicalData: z.string(),
  currentTrends: z.string(),
  groupPreferences: z.string().optional(),
});

export async function getSuggestedActivitiesAction(
  input: z.infer<typeof SuggestActivitiesServerInputSchema>
): Promise<{ success: boolean; data?: SuggestActivitiesOutput; error?: string }> {
  try {
    // Validate input strictly on server
    const validatedInput = SuggestActivitiesServerInputSchema.parse(input);
    
    const result = await suggestActivitiesFlow(validatedInput);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in getSuggestedActivitiesAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: `Invalid input: ${error.errors.map(e => e.message).join(', ')}` };
    }
    // Pass through the error message from the flow if it's an Error instance
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to get activity suggestions due to an unexpected issue. Please try again." };
  }
}

