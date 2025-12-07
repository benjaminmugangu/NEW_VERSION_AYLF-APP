"use client";

import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Site, SiteFormData } from "@/lib/types";
import { Building, Save } from "lucide-react";
import { useTranslations } from "next-intl";

interface SiteFormProps {
  site?: Site; // For editing
  onSubmitForm: (data: SiteFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function SiteForm({ site, onSubmitForm, isSubmitting: isParentSubmitting }: SiteFormProps) {
  const t = useTranslations('SiteForm');

  const siteFormSchema = useMemo(() => z.object({
    name: z.string().min(3, t('validation.name_min')),
    city: z.string().min(2, t('validation.city_min')),
    country: z.string().min(2, t('validation.country_min')),
    creationDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: t('validation.date_invalid') }),
    coordinatorId: z.string().optional().or(z.literal("")).nullable(),
  }), [t]);

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
          {site ? t('title_edit') : t('title_create')}
        </CardTitle>
        <CardDescription>
          {site ? t('desc_edit', { name: site.name }) : t('desc_create')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">{t('name_label')}</Label>
              <Input id="name" {...register("name")} placeholder={t('name_placeholder')} className="mt-1" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="creationDate">{t('creation_date_label')}</Label>
              <Input id="creationDate" type="date" {...register("creationDate")} className="mt-1" />
              {errors.creationDate && <p className="text-sm text-destructive mt-1">{errors.creationDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="city">{t('city_label')}</Label>
              <Input id="city" {...register("city")} placeholder={t('city_placeholder')} className="mt-1" />
              {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <Label htmlFor="country">{t('country_label')}</Label>
              <Input id="country" {...register("country")} placeholder={t('country_placeholder')} className="mt-1" />
              {errors.country && <p className="text-sm text-destructive mt-1">{errors.country.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="coordinatorId">{t('coordinator_label')}</Label>
            <Input
              id="coordinatorId"
              {...register("coordinatorId")}
              placeholder={t('coordinator_placeholder')}
              className="mt-1"
            />
            {errors.coordinatorId && <p className="text-sm text-destructive mt-1">{errors.coordinatorId.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {t('coordinator_help')}
            </p>
          </div>

          <Button type="submit" className="w-full py-3 text-base" disabled={isParentSubmitting || isFormSubmitting}>
            <Save className="mr-2 h-5 w-5" />
            {(isParentSubmitting || isFormSubmitting) ? t('saving') : (site ? t('save') : t('add'))}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
