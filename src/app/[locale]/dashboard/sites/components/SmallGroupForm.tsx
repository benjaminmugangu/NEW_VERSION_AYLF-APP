"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SmallGroup, User, SmallGroupFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import * as profileService from "@/services/profileService";
import { ROLES } from "@/lib/constants";
import { Users, Save } from "lucide-react";
import { useTranslations } from "next-intl";

const UNASSIGNED_VALUE = "__UNASSIGNED__"; // Represents no selection
const ALLOWED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

interface SmallGroupFormProps {
  smallGroup?: SmallGroup; // For editing
  siteId: string;
  onSubmitForm: (data: SmallGroupFormData) => Promise<any>;
  isSaving?: boolean;
}

export function SmallGroupForm({ smallGroup, siteId, onSubmitForm, isSaving }: SmallGroupFormProps) {
  const { toast } = useToast();
  const t = useTranslations('SmallGroupForm');
  const [availablePersonnel, setAvailablePersonnel] = useState<User[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(true);

  const smallGroupFormSchema = useMemo(() => z.object({
    name: z.string().min(3, t('validation.name_min')),
    leaderId: z.string().optional().nullable(),
    logisticsAssistantId: z.string().optional().nullable(),
    financeAssistantId: z.string().optional().nullable(),
    meetingDay: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
    meetingTime: z.string().optional(), // You might want to add a regex for time format
    meetingLocation: z.string().optional(),
  }), [t]);

  const { control, handleSubmit, register, formState: { errors, isSubmitting }, reset } = useForm<SmallGroupFormData>({
    resolver: zodResolver(smallGroupFormSchema),
    defaultValues: smallGroup ? {
      name: smallGroup.name,
      leaderId: smallGroup.leaderId || undefined,
      logisticsAssistantId: smallGroup.logisticsAssistantId || undefined,
      financeAssistantId: smallGroup.financeAssistantId || undefined,
      meetingDay: ALLOWED_DAYS.includes((smallGroup.meetingDay as any) || '') ? (smallGroup.meetingDay as any) : undefined,
      meetingTime: smallGroup.meetingTime,
      meetingLocation: smallGroup.meetingLocation,
    } : {
      name: "",
      leaderId: undefined,
      logisticsAssistantId: undefined,
      financeAssistantId: undefined,
      meetingDay: undefined,
      meetingTime: "",
      meetingLocation: "",
    },
  });

  useEffect(() => {
    const fetchPersonnel = async () => {
      setIsLoadingPersonnel(true);
      try {
        const response = await profileService.getEligiblePersonnel(siteId, smallGroup?.id);
        if (response.success && response.data) {
          setAvailablePersonnel(response.data);
        } else {
          // Optionally handle error here or just set empty
          setAvailablePersonnel([]);
          if (!response.success && response.error) {
            console.error("Failed to fetch personnel:", response.error);
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast({ title: "Error", description: `Failed to load personnel: ${message}`, variant: 'destructive' });
      } finally {
        setIsLoadingPersonnel(false);
      }
    };

    fetchPersonnel();
  }, [siteId, smallGroup?.id, toast]);

  const processSubmit = async (data: SmallGroupFormData) => {
    await onSubmitForm(data);
    if (!smallGroup) {
      reset();
    }
  };

  return (
    <Card className="shadow-xl w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Users className="mr-3 h-7 w-7 text-primary" />
          {smallGroup ? t('title_edit') : t('title_create')}
        </CardTitle>
        <CardDescription>
          {smallGroup ? t('desc_edit', { name: smallGroup.name }) : t('desc_create', { siteId })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">{t('name_label')}</Label>
            <Input id="name" {...register("name")} placeholder={t('name_placeholder')} className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="meetingDay">{t('day_label')}</Label>
              <Input id="meetingDay" {...register("meetingDay")} placeholder={t('day_placeholder')} className="mt-1" />
              {errors.meetingDay && <p className="text-sm text-destructive mt-1">{errors.meetingDay.message}</p>}
            </div>
            <div>
              <Label htmlFor="meetingTime">{t('time_label')}</Label>
              <Input id="meetingTime" {...register("meetingTime")} placeholder={t('time_placeholder')} className="mt-1" />
              {errors.meetingTime && <p className="text-sm text-destructive mt-1">{errors.meetingTime.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="meetingLocation">{t('location_label')}</Label>
            <Input id="meetingLocation" {...register("meetingLocation")} placeholder={t('location_placeholder')} className="mt-1" />
            {errors.meetingLocation && <p className="text-sm text-destructive mt-1">{errors.meetingLocation.message}</p>}
          </div>

          <div>
            <Label htmlFor="leaderId">{t('leader_label')}</Label>
            <Controller
              name="leaderId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value === UNASSIGNED_VALUE ? undefined : value)}
                  value={field.value || UNASSIGNED_VALUE}
                >
                  <SelectTrigger id="leaderId" className="mt-1" disabled={isLoadingPersonnel}>
                    <SelectValue placeholder={isLoadingPersonnel ? t('loading') : t('leader_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>{t('none_unassigned')}</SelectItem>
                    {availablePersonnel.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role.replaceAll('_', ' ').replaceAll(/\b\w/g, l => l.toUpperCase())})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.leaderId && <p className="text-sm text-destructive mt-1">{errors.leaderId.message}</p>}
          </div>

          <div>
            <Label htmlFor="logisticsAssistantId">{t('logistics_label')}</Label>
            <Controller
              name="logisticsAssistantId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value === UNASSIGNED_VALUE ? undefined : value)}
                  value={field.value || UNASSIGNED_VALUE}
                >
                  <SelectTrigger id="logisticsAssistantId" className="mt-1" disabled={isLoadingPersonnel}>
                    <SelectValue placeholder={t('select_logistics')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>{t('none_unassigned')}</SelectItem>
                    {availablePersonnel.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role.replaceAll('_', ' ').replaceAll(/\b\w/g, l => l.toUpperCase())})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.logisticsAssistantId && <p className="text-sm text-destructive mt-1">{errors.logisticsAssistantId.message}</p>}
          </div>

          <div>
            <Label htmlFor="financeAssistantId">{t('finance_label')}</Label>
            <Controller
              name="financeAssistantId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value === UNASSIGNED_VALUE ? undefined : value)}
                  value={field.value || UNASSIGNED_VALUE}
                >
                  <SelectTrigger id="financeAssistantId" className="mt-1" disabled={isLoadingPersonnel}>
                    <SelectValue placeholder={t('select_finance')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>{t('none_unassigned')}</SelectItem>
                    {availablePersonnel.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role.replaceAll('_', ' ').replaceAll(/\b\w/g, l => l.toUpperCase())})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.financeAssistantId && <p className="text-sm text-destructive mt-1">{errors.financeAssistantId.message}</p>}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {t('help_text')}
          </p>

          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting || isSaving}>
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting || isSaving ? t('saving') : (smallGroup ? t('save') : t('add'))}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
