import * as z from 'zod';

// Zod schema for validating activity form data
export const activityFormSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters long.'),
    thematic: z.string().min(3, 'Thematic must be at least 3 characters long.'),
    date: z.date(),
    level: z.enum(["national", "site", "small_group"]),
    status: z.enum(["planned", "in_progress", "delayed", "executed", "canceled"]).default('planned'),
    siteId: z.string().optional(),
    smallGroupId: z.string().optional(),
    activityTypeId: z.string().optional(), // Keep for legacy compatibility
    activityTypeEnum: z.enum(["small_group_meeting", "conference", "apostolat", "deuil", "other"]).optional(),
    participantsCountPlanned: z.number().int().min(0).optional(),
    createdBy: z.string(),
}).refine(data => {
    if (data.level === 'national') return !data.siteId && !data.smallGroupId;
    if (data.level === 'site') return !!data.siteId && !data.smallGroupId;
    if (data.level === 'small_group') return !!data.smallGroupId; // Removed !data.siteId strict check to allow UI filtering
    return true;
}, {
    message: 'Invalid level-entity mapping: Selected level requires specific context (Site or Group).',
    path: ['level'],
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;
