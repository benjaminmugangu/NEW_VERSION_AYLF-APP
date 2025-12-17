import * as z from 'zod';
import { ROLES } from '@/lib/constants';

export const userFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  role: z.enum([ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]),
  siteId: z.string().nullable().optional(),
  smallGroupId: z.string().nullable().optional(),
  mandateStartDate: z.coerce.date().nullable().optional(),
  mandateEndDate: z.coerce.date().nullable().optional(),
  status: z.enum(["active", "inactive", "invited"]).optional().default("active"),
});

export const refinedUserFormSchema = userFormSchema
  .refine(data => data.role !== ROLES.SITE_COORDINATOR || !!data.siteId, {
    message: "Site assignment is required for Site Coordinators.",
    path: ["siteId"],
  })
  .refine(data => data.role !== ROLES.SMALL_GROUP_LEADER || (!!data.siteId && !!data.smallGroupId), {
    message: "Site and Small Group assignment are required for Small Group Leaders.",
    path: ["smallGroupId"],
  })
  .refine(data => !data.mandateEndDate || !data.mandateStartDate || (data.mandateEndDate >= data.mandateStartDate), {
    message: "End date cannot be before start date.",
    path: ["mandateEndDate"],
  });

export type UserFormData = z.infer<typeof refinedUserFormSchema>;
