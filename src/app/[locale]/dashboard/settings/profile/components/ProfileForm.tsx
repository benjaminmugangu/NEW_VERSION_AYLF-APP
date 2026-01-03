// src/app/dashboard/settings/profile/components/ProfileForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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

import { updateProfile, uploadAvatar } from '@/services/profileService';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";

interface ProfileFormProps {
  currentUser: User;
  onUpdateProfile?: (updatedData: Partial<User>) => void; // Legacy, optional
  canEdit: boolean;
}

export function ProfileForm({ currentUser, onUpdateProfile, canEdit }: ProfileFormProps) {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations('Profile');
  const tRoles = useTranslations('Roles');
  const formatDateTime = useFormatter();

  // Optimistic UI for Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentUser.avatarUrl);

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
    // Sync Avatar if prop updates (revalidation)
    setAvatarUrl(currentUser.avatarUrl);

    const fetchAssignments = async () => {
      // ... existing fetch logic
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
      } finally {
        setIsLoadingAssignment(false);
      }
    };
    fetchAssignments();
  }, [currentUser, t]); // Removed toast from dependencies to avoid loop

  const { control, register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser.name || "",
      email: currentUser.email || "",
      mandateStartDate: currentUser.mandateStartDate ? parseISO(currentUser.mandateStartDate) : undefined,
      mandateEndDate: currentUser.mandateEndDate ? parseISO(currentUser.mandateEndDate) : undefined,
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const newUrl = await uploadAvatar(formData);
      // Cache bust the URL to ensure the browser fetches the new image immediately
      const cacheBustUrl = `${newUrl}${newUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
      setAvatarUrl(cacheBustUrl);

      // Force Next.js server component refresh (for sidebar avatars etc.)
      router.refresh();

      toast({ title: "Success", description: "Profile photo updated successfully." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to upload photo.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const profileUpdateData: Partial<User> = {
        name: data.name,
        email: data.email,
        mandateStartDate: data.mandateStartDate ? data.mandateStartDate.toISOString() : undefined,
        mandateEndDate: data.mandateEndDate ? data.mandateEndDate.toISOString() : undefined,
      };

      // Call Server Action
      await updateProfile(currentUser.id, profileUpdateData);

      // Force refresh for any server-side rendered profile data
      router.refresh();

      if (onUpdateProfile) onUpdateProfile(profileUpdateData); // Keep legacy just in case

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

  const getRoleDisplayName = (role: User["role"]) => tRoles(role as any);

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
        <CardDescription>{canEdit ? t('update_desc') : t('view_desc')}</CardDescription>
      </CardHeader>
      <CardContent>

        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="relative group">
            <Avatar className="h-24 w-24 cursor-pointer border-2 border-primary/10">
              <AvatarImage src={avatarUrl} alt={currentUser.name} />
              <AvatarFallback className="text-xl bg-primary/5 text-primary">
                {currentUser.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {canEdit && (
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Camera size={16} />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
          {isUploading && <p className="text-xs text-muted-foreground animate-pulse">Uploading...</p>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">{t('full_name')}</Label>
            <Input id="name" {...register("name")} disabled={!canEdit || isSubmitting} className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" {...register("email")} disabled={!canEdit || isSubmitting} className="mt-1" />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="role">{t('role')}</Label>
            <Input id="role" value={getRoleDisplayName(currentUser.role)} disabled className="mt-1 bg-muted/50" />
          </div>

          {(currentUser.role === ROLES.SITE_COORDINATOR || currentUser.role === ROLES.SMALL_GROUP_LEADER) && (
            <div>
              <Label htmlFor="assignment">{t('assignment')}</Label>
              <Input id="assignment" value={getAssignmentName()} disabled className="mt-1 bg-muted/50" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mandateStartDate">{t('mandate_start')}</Label>
              <Controller
                name="mandateStartDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")} disabled={!isMandateDateEditingAllowed || isSubmitting}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? formatDateTime.dateTime(field.value, { dateStyle: 'long' }) : (isMandateDateEditingAllowed ? <span>{t('pick_date')}</span> : <span>N/A</span>)}
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
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")} disabled={!isMandateDateEditingAllowed || isSubmitting}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? formatDateTime.dateTime(field.value, { dateStyle: 'long' }) : (isMandateDateEditingAllowed ? <span>{t('pick_date_optional')}</span> : <span>N/A</span>)}
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
