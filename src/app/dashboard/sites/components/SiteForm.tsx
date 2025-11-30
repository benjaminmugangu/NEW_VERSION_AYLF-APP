// src/app/dashboard/sites/components/SiteForm.tsx
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Site, SiteFormData } from "@/lib/types";
import { Building, Save } from "lucide-react";

const siteFormSchema = z.object({
  name: z.string().min(3, "Site name must be at least 3 characters."),
  city: z.string().min(2, "City must be at least 2 characters."),
  country: z.string().min(2, "Country must be at least 2 characters."),
  creationDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  coordinatorId: z.string().optional().or(z.literal("")).nullable(),
});

interface SiteFormProps {
  site?: Site; // For editing
  onSubmitForm: (data: SiteFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function SiteForm({ site, onSubmitForm, isSubmitting: isParentSubmitting }: SiteFormProps) {
  const { handleSubmit, register, formState: { errors, isSubmitting: isFormSubmitting }, reset } = useForm<SiteFormData>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: site ? {
      name: site.name,
      city: site.city,
      country: site.country,
      creationDate: site.creationDate.split('T')[0], // Format for date input
      coordinatorId: site.coordinatorId || "",
    } : {
      name: "",
      city: "",
      country: "",
      creationDate: new Date().toISOString().split('T')[0],
      coordinatorId: "",
    },
  });

  const processSubmit = async (data: SiteFormData) => {
    // Ensure optional coordinatorId is undefined if empty string after validation
    const dataToSubmit: SiteFormData = {
      ...data,
      coordinatorId: data.coordinatorId === "" ? undefined : data.coordinatorId,
    };
    await onSubmitForm(dataToSubmit);
    if (!site) {
      reset({
        name: "",
        city: "",
        country: "",
        creationDate: new Date().toISOString().split('T')[0],
        coordinatorId: "",
      }); // Reset form only if creating
    }
  };

  return (
    <Card className="shadow-xl w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Building className="mr-3 h-7 w-7 text-primary" />
          {site ? "Edit Site" : "Add New Site"}
        </CardTitle>
        <CardDescription>
          {site ? `Update details for ${site.name}.` : "Fill in the details for the new site."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Site Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g., Goma Site" className="mt-1" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="creationDate">Creation Date</Label>
              <Input id="creationDate" type="date" {...register("creationDate")} className="mt-1" />
              {errors.creationDate && <p className="text-sm text-destructive mt-1">{errors.creationDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} placeholder="e.g., Goma" className="mt-1" />
              {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} placeholder="e.g., DRC" className="mt-1" />
              {errors.country && <p className="text-sm text-destructive mt-1">{errors.country.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="coordinatorId">Site Coordinator Name (Optional)</Label>
            <Input
              id="coordinatorId"
              {...register("coordinatorId")}
              placeholder="Enter coordinator's full name"
              className="mt-1"
            />
            {errors.coordinatorId && <p className="text-sm text-destructive mt-1">{errors.coordinatorId.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Enter the full name of the site coordinator. This can be assigned or updated later.
            </p>
          </div>

          <Button type="submit" className="w-full py-3 text-base" disabled={isParentSubmitting || isFormSubmitting}>
            <Save className="mr-2 h-5 w-5" />
            {(isParentSubmitting || isFormSubmitting) ? "Saving..." : (site ? "Save Changes" : "Add Site")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
