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
    activityTypeId: z.string().min(1, 'Activity type is required.'),
    participantsCountPlanned: z.number().int().min(0).optional(),
    createdBy: z.string(),
}).refine(data => data.level !== 'site' || !!data.siteId, {
    message: 'Site is required for site-level activities.',
    path: ['siteId'],
}).refine(data => data.level !== 'small_group' || !!data.smallGroupId, {
    message: 'Small group is required for small group level activities.',
    path: ['smallGroupId'],
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;
