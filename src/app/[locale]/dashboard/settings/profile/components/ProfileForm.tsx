// src/app/dashboard/settings/profile/components/ProfileForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { User, Site, SmallGroup } from "@/lib/types";
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';
import { ROLES } from "@/lib/constants";

import { Save, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations, useFormatter } from 'next-intl';

interface ProfileFormProps {
  currentUser: User;
  onUpdateProfile?: (updatedData: Partial<User>) => void;
  canEdit: boolean;
}

export function ProfileForm({ currentUser, onUpdateProfile, canEdit }: ProfileFormProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true);
  const { toast } = useToast();
  const t = useTranslations('Profile');
  const tRoles = useTranslations('Roles');
  const formatDateTime = useFormatter();

  // Define schema inside the component to use translations
  const profileFormSchema = useMemo(() => z.object({
    name: z.string().min(3, t('name_error')),
    email: z.string().email(t('email_error')),
    mandateStartDate: z.date().optional().nullable(),
    mandateEndDate: z.date().optional().nullable(),
  }).refine(data => !data.mandateEndDate || !data.mandateStartDate || (data.mandateEndDate >= data.mandateStartDate), {
    message: t('mandate_error'),
    path: ["mandateEndDate"],
  }), [t]);

  type ProfileFormData = z.infer<typeof profileFormSchema>;

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!currentUser.siteId && !currentUser.smallGroupId) {
        setIsLoadingAssignment(false);
        return;
      }

      setIsLoadingAssignment(true);
      try {
        const sitesData = await siteService.getSitesWithDetails(currentUser);
        setSites(sitesData);

        if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
          const smallGroupsData = await smallGroupService.getFilteredSmallGroups({ user: currentUser });
          setSmallGroups(smallGroupsData);
        }
      } catch (error) {
        console.error("Failed to fetch assignments", error);
        toast({ title: t('update_failed'), description: "Could not load assignment data.", variant: "destructive" });
      } finally {
        setIsLoadingAssignment(false);
      }
    };

    fetchAssignments();
  }, [currentUser, t, toast]); // Added missing dependencies

  const { control, register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser.name || "",
      email: currentUser.email || "",
      mandateStartDate: currentUser.mandateStartDate ? parseISO(currentUser.mandateStartDate) : undefined,
      mandateEndDate: currentUser.mandateEndDate ? parseISO(currentUser.mandateEndDate) : undefined,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const profileUpdateData: Partial<User> = {
        name: data.name,
        email: data.email,
        mandateStartDate: data.mandateStartDate ? data.mandateStartDate.toISOString() : undefined,
        mandateEndDate: data.mandateEndDate ? data.mandateEndDate.toISOString() : undefined,
      };
      if (onUpdateProfile) {
        onUpdateProfile(profileUpdateData);
      }
      toast({
        title: t('profile_updated'),
        description: t('update_success'),
      });
    } catch (error) {
      toast({
        title: t('update_failed'),
        description: t('fail_desc'),
        variant: "destructive",
      });
    }
  };

  const getRoleDisplayName = (role: User["role"]) => {
    return tRoles(role as any);
  };

  const getAssignmentName = () => {
    if (isLoadingAssignment) return "Loading assignment...";

    if (currentUser.role === ROLES.SITE_COORDINATOR && currentUser.siteId) {
      return sites.find(s => s.id === currentUser.siteId)?.name || t('unknown_site');
    }
    if (currentUser.role === ROLES.SMALL_GROUP_LEADER && currentUser.smallGroupId) {
      const sg = smallGroups.find(sg => sg.id === currentUser.smallGroupId);
      if (sg) {
        const site = sites.find(s => s.id === sg.siteId);
        return `${sg.name} (Site: ${site?.name || 'Unknown'})`;
      }
      return t('unknown_group');
    }
    return "N/A";
  };

  const isMandateDateEditingAllowed = canEdit && currentUser.role === ROLES.NATIONAL_COORDINATOR;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('personal_info')}</CardTitle>
        <CardDescription>
          {canEdit ? t('update_desc') : t('view_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">{t('full_name')}</Label>
            <Input
              id="name"
              {...register("name")}
              disabled={!canEdit || isSubmitting}
              className="mt-1"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={!canEdit || isSubmitting}
              className="mt-1"
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="role">{t('role')}</Label>
            <Input
              id="role"
              value={getRoleDisplayName(currentUser.role)}
              disabled
              className="mt-1 bg-muted/50"
            />
          </div>

          {(currentUser.role === ROLES.SITE_COORDINATOR || currentUser.role === ROLES.SMALL_GROUP_LEADER) && (
            <div>
              <Label htmlFor="assignment">{t('assignment')}</Label>
              <Input
                id="assignment"
                value={getAssignmentName()}
                disabled
                className="mt-1 bg-muted/50"
              />
            </div>
          )}

          <div>
            <Label htmlFor="mandateStartDate">{t('mandate_start')}</Label>
            <Controller
              name="mandateStartDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}
                      disabled={!isMandateDateEditingAllowed || isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? formatDateTime.dateTime(field.value, { dateStyle: 'long' }) :
                        (isMandateDateEditingAllowed ? <span>{t('pick_date')}</span> : <span>N/A</span>)
                      }
                    </Button>
                  </PopoverTrigger>
                  {isMandateDateEditingAllowed && (
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  )}
                </Popover>
              )}
            />
            {errors.mandateStartDate && <p className="text-sm text-destructive mt-1">{errors.mandateStartDate.message}</p>}
          </div>

          <div>
            <Label htmlFor="mandateEndDate">{t('mandate_end')}</Label>
            <Controller
              name="mandateEndDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}
                      disabled={!isMandateDateEditingAllowed || isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? formatDateTime.dateTime(field.value, { dateStyle: 'long' }) :
                        (isMandateDateEditingAllowed ? <span>{t('pick_date_optional')}</span> : <span>N/A</span>)
                      }
                    </Button>
                  </PopoverTrigger>
                  {isMandateDateEditingAllowed && (
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} />
                    </PopoverContent>
                  )}
                </Popover>
              )}
            />
            {errors.mandateEndDate && <p className="text-sm text-destructive mt-1">{errors.mandateEndDate.message}</p>}
          </div>

          {canEdit && (
            <Button type="submit" disabled={isSubmitting || !isDirty} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? t('saving') : t('save_changes')}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
