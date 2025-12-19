"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Member, MemberFormData, Site, SmallGroup } from "@/lib/types";
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@/lib/constants";
import { useTranslations } from "next-intl";

interface MemberFormProps {
  member?: Member;
  onSubmitForm: (data: MemberFormData) => Promise<void>;
}

export function MemberForm({ member, onSubmitForm }: MemberFormProps) {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const t = useTranslations('MemberForm');
  const tLevel = useTranslations('ActivityLevel');

  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);

  if (isAuthLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading user profile...</div>;
  }

  if (!currentUser) {
    return (
      <Card className="shadow-xl w-full max-w-xl mx-auto border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Authentication Error</CardTitle>
          <CardDescription>
            Unable to load user profile. Please try refreshing the page or logging in again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Move schema definition inside component to use translations
  const memberFormSchema = useMemo(() => z.object({
    name: z.string().min(3, t('validation.name_min')),
    gender: z.enum(["male", "female"]),
    phone: z.string().optional(),
    email: z.string().email(t('validation.email_invalid')).optional().or(z.literal('')),
    type: z.enum(["student", "non-student"], { required_error: t('validation.type_required') }),
    joinDate: z.date({ required_error: t('validation.date_required') }),
    level: z.enum(["national", "site", "small_group"], { required_error: t('validation.level_required') }),
    siteId: z.string().optional(),
    smallGroupId: z.string().optional(),
  }).refine(data => {
    if (data.level === 'site' && !data.siteId) return false;
    return true;
  }, { message: t('validation.site_required'), path: ["siteId"] })
    .refine(data => {
      if (data.level === 'small_group' && !data.smallGroupId) return false;
      return true;
    }, { message: t('validation.group_required'), path: ["smallGroupId"] }), [t]);

  const getInitialLevel = () => {
    if (member) return member.level;
    if (currentUser?.role === ROLES.SITE_COORDINATOR) return 'site';
    if (currentUser?.role === ROLES.SMALL_GROUP_LEADER) return 'small_group';
    return 'national';
  };

  const { control, handleSubmit, register, watch, formState: { errors, isSubmitting }, reset, setValue } = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: member ? {
      ...member,
      joinDate: member.joinDate ? parseISO(member.joinDate) : new Date(),
    } : {
      name: '',
      gender: 'male',
      phone: '',
      email: '',
      joinDate: new Date(),
      type: "student",
      level: getInitialLevel(),
      siteId: currentUser?.siteId ?? undefined,
      smallGroupId: currentUser?.smallGroupId ?? undefined,
    },
  });

  const watchedLevel = watch("level");
  const watchedSiteId = watch("siteId");

  const canChangeLevel = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSite = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSmallGroup = currentUser?.role === ROLES.NATIONAL_COORDINATOR || currentUser?.role === ROLES.SITE_COORDINATOR;

  useEffect(() => {
    const fetchSites = async () => {
      if (!currentUser) return;
      try {
        if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
          const sitesData = await siteService.getSitesWithDetails(currentUser);
          setSites(sitesData);
        } else if (currentUser.role === ROLES.SITE_COORDINATOR && currentUser.siteId) {
          const siteData = await siteService.getSiteById(currentUser.siteId);
          if (siteData) setSites([siteData]);
        }
      } catch (error) {
        console.error('Failed to fetch sites:', error);
        setSites([]);
      }
    };
    fetchSites();
  }, [currentUser]);

  useEffect(() => {
    const fetchSmallGroups = async () => {
      if (watchedSiteId && currentUser) {
        try {
          const smallGroupsData = await smallGroupService.getFilteredSmallGroups({ user: currentUser, siteId: watchedSiteId });
          setSmallGroups(smallGroupsData);
        } catch (error) {
          console.error('Failed to fetch small groups:', error);
          setSmallGroups([]);
        }
      } else {
        setSmallGroups([]);
      }
    };

    if (watchedLevel === 'small_group' || watchedLevel === 'site') {
      fetchSmallGroups();
    }
  }, [watchedSiteId, watchedLevel, currentUser]);

  // When currentUser loads after first render, reset defaults for new member form
  useEffect(() => {
    if (!member && currentUser) {
      reset({
        name: '',
        gender: 'male',
        phone: '',
        email: '',
        joinDate: new Date(),
        type: 'student',
        level: getInitialLevel(),
        siteId: currentUser.siteId ?? undefined,
        smallGroupId: currentUser.smallGroupId ?? undefined,
      });
    }
  }, [currentUser, member, reset]);

  const processSubmit = async (data: MemberFormData) => {
    const finalData = {
      ...data,
      siteId: data.siteId === '' ? undefined : data.siteId,
      smallGroupId: data.smallGroupId === '' ? undefined : data.smallGroupId
    }
    await onSubmitForm(finalData);
    if (!member) {
      reset();
    }
  };

  return (
    <Card className="shadow-xl w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <UserPlus className="mr-3 h-7 w-7 text-primary" />
          {member ? t('title_edit') : t('title_create')}
        </CardTitle>
        <CardDescription>
          {member ? t('desc_edit', { name: member.name }) : t('desc_create')}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t('email_label')}</Label>
              <Input id="email" type="email" {...register("email")} className="mt-1" placeholder={t('email_placeholder')} />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">{t('phone_label')}</Label>
              <Input id="phone" type="tel" {...register("phone")} className="mt-1" placeholder={t('phone_placeholder')} />
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">{t('gender_label')}</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="gender" className="mt-1">
                      <SelectValue placeholder={t('gender_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('gender_options.male')}</SelectItem>
                      <SelectItem value="female">{t('gender_options.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>}
            </div>
            <div>
              <Label htmlFor="type">{t('type_label')}</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="type" className="mt-1">
                      <SelectValue placeholder={t('type_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">{t('type_options.student')}</SelectItem>
                      <SelectItem value="non_student">{t('type_options.non_student')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="joinDate">{t('join_date_label')}</Label>
            <Controller
              name="joinDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>{t('pick_date')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.joinDate && <p className="text-sm text-destructive mt-1">{errors.joinDate.message}</p>}
          </div>

          <div>
            <Label htmlFor="level">{t('level_label')}</Label>
            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!canChangeLevel}>
                  <SelectTrigger id="level" className="mt-1">
                    <SelectValue placeholder={t('level_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">{tLevel('national')}</SelectItem>
                    <SelectItem value="site">{tLevel('site')}</SelectItem>
                    <SelectItem value="small_group">{tLevel('small_group')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.level && <p className="text-sm text-destructive mt-1">{errors.level.message}</p>}
          </div>

          {(watchedLevel === 'site' || watchedLevel === 'small_group') && (
            <div>
              <Label htmlFor="siteId">{t('site_label')}</Label>
              <Controller
                name="siteId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canChangeSite}>
                    <SelectTrigger id="siteId" className="mt-1">
                      <SelectValue placeholder={t('site_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.siteId && <p className="text-sm text-destructive mt-1">{errors.siteId.message}</p>}
            </div>
          )}

          {watchedLevel === 'small_group' && (
            <div>
              <Label htmlFor="smallGroupId">{t('small_group_label')}</Label>
              <Controller
                name="smallGroupId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canChangeSmallGroup || !watchedSiteId}>
                    <SelectTrigger id="smallGroupId" className="mt-1">
                      <SelectValue placeholder={t('small_group_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {smallGroups.map(sg => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.smallGroupId && <p className="text-sm text-destructive mt-1">{errors.smallGroupId.message}</p>}
            </div>
          )}

          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? t('saving') : (member ? t('save') : t('add'))}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
