"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { User, Site, SmallGroup } from "@/lib/types";
import { ROLES } from "@/lib/constants";
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, UsersRound } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { refinedUserFormSchema, type UserFormData } from "@/schemas/user";

interface UserFormProps {
  readonly user?: User;
  readonly onSubmitForm: (data: UserFormData) => Promise<void>;
  readonly isSubmitting: boolean;
}

export function UserForm({ user, onSubmitForm, isSubmitting: isSubmittingProp }: UserFormProps) {
  const { toast } = useToast();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const t = useTranslations('Users.forms');
  const tCommon = useTranslations('Common');
  const tRole = useTranslations('Roles');
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [availableSmallGroups, setAvailableSmallGroups] = useState<SmallGroup[]>([]);

  // Determine permissions based on CURRENT USER (The Creator)
  const isNational = currentUser?.role === ROLES.NATIONAL_COORDINATOR;

  // Initialize default values with context awareness
  const defaultValues: Partial<UserFormData> = user ? {
    ...user,
    mandateStartDate: user.mandateStartDate ? new Date(user.mandateStartDate) : undefined,
    mandateEndDate: user.mandateEndDate ? new Date(user.mandateEndDate) : undefined,
    status: user.status || "active",
  } : {
    name: '',
    email: '',
    role: ROLES.SMALL_GROUP_LEADER,
    mandateStartDate: new Date(),
    status: "active" as const,
    siteId: currentUser?.role === ROLES.NATIONAL_COORDINATOR ? null : (currentUser?.siteId ?? null),
    smallGroupId: currentUser?.role === ROLES.SMALL_GROUP_LEADER ? (currentUser?.smallGroupId ?? null) : null,
  };

  const { control, handleSubmit, register, watch, formState: { errors, isSubmitting: isFormSubmitting } } = useForm<UserFormData>({
    resolver: zodResolver(refinedUserFormSchema),
    defaultValues,
  });

  const watchedRole = watch("role");
  const watchedSiteId = watch("siteId");

  // Visibility & Locking Logic
  const showSiteField = watchedRole === ROLES.SITE_COORDINATOR || watchedRole === ROLES.SMALL_GROUP_LEADER;
  const lockSiteField = !isNational;
  const showSmallGroupField = watchedRole === ROLES.SMALL_GROUP_LEADER;

  // Fetch sites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        if (currentUser) {
          if (isNational) {
            const sites = await siteService.getSitesWithDetails(currentUser);
            setAvailableSites(sites);
          } else if (currentUser.siteId) {
            const sites = await siteService.getSitesWithDetails(currentUser);
            const mySite = sites.find(s => s.id === currentUser.siteId);
            setAvailableSites(mySite ? [mySite] : []);
          }
        }
      } catch (error) {
        console.error('Error fetching sites:', error);
        toast({ title: 'Error loading sites', description: 'Failed to load sites context', variant: 'destructive' });
      }
    };
    fetchSites();
  }, [currentUser, isNational, toast]);

  // Fetch small groups
  useEffect(() => {
    const fetchSmallGroups = async () => {
      if (watchedSiteId && (watchedRole === ROLES.SMALL_GROUP_LEADER)) {
        try {
          const smallGroups = await smallGroupService.getSmallGroupsBySite(watchedSiteId);
          setAvailableSmallGroups(smallGroups);
        } catch (error) {
          console.error('Error fetching small groups:', error);
          setAvailableSmallGroups([]);
        }
      } else {
        setAvailableSmallGroups([]);
      }
    };
    fetchSmallGroups();
  }, [watchedSiteId, watchedRole]);

  if (isAuthLoading) {
    return <div className="p-8 text-center text-muted-foreground">{tCommon('loading')}</div>;
  }

  if (!currentUser) {
    return (
      <Card className="shadow-xl w-full max-w-xl mx-auto border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">{tCommon('error')}</CardTitle>
          <CardDescription>
            {tCommon('error')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const processSubmit = async (data: UserFormData) => {
    await onSubmitForm(data);
  };

  const getButtonText = () => {
    if (isFormSubmitting || isSubmittingProp) return "Saving...";
    return user ? "Update User" : "Create User";
  };

  return (
    <Card className="shadow-xl w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <UsersRound className="mr-3 h-7 w-7 text-primary" />
          {user ? t('edit_user') : t('add_new')}
        </CardTitle>
        <CardDescription>
          {user ? t('update_details', { name: user.name }) : t('fill_details')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">{t('name_label')}</Label>
            <Input id="name" {...register("name")} placeholder="e.g., Jane Doe" className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">{t('email_label')}</Label>
            <Input id="email" type="email" {...register("email")} placeholder="user@example.com" className="mt-1" />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="role">{t('role_label')}</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="role" className="mt-1">
                      <SelectValue placeholder={t('select_role')} />
                    </SelectTrigger>
                    <SelectContent>
                      {isNational && <SelectItem value={ROLES.NATIONAL_COORDINATOR}>{tRole('NATIONAL_COORDINATOR')}</SelectItem>}
                      {(isNational) && <SelectItem value={ROLES.SITE_COORDINATOR}>{tRole('SITE_COORDINATOR')}</SelectItem>}
                      <SelectItem value={ROLES.SMALL_GROUP_LEADER}>{tRole('SMALL_GROUP_LEADER')}</SelectItem>
                      <SelectItem value={ROLES.MEMBER}>{tRole('MEMBER')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
            </div>
            <div>
              <Label htmlFor="status">{t('status_label')}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || "active"}>
                    <SelectTrigger id="status" className="mt-1">
                      <SelectValue placeholder={t('select_status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{tRole('active') || 'Active'}</SelectItem>
                      <SelectItem value="inactive">{tRole('inactive') || 'Inactive'}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-sm text-destructive mt-1">{errors.status.message}</p>}
            </div>
          </div>

          {showSiteField && (
            <div>
              <Label htmlFor="siteId">{t('site_label')}</Label>
              <Controller
                name="siteId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? undefined}
                    disabled={lockSiteField || availableSites.length === 0}
                  >
                    <SelectTrigger id="siteId" className="mt-1">
                      <SelectValue placeholder={t('select_site')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSites.map((site: Site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.siteId && <p className="text-sm text-destructive mt-1">{errors.siteId.message}</p>}
            </div>
          )}

          {showSmallGroupField && (
            <div>
              <Label htmlFor="smallGroupId">{t('group_label')}</Label>
              <Controller
                name="smallGroupId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? undefined}
                    disabled={!watchedSiteId || availableSmallGroups.length === 0}
                  >
                    <SelectTrigger id="smallGroupId" className="mt-1">
                      <SelectValue placeholder={watchedSiteId ? t('select_group') : t('select_site')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSmallGroups.map((sg: SmallGroup) => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.smallGroupId && <p className="text-sm text-destructive mt-1">{errors.smallGroupId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="mandateStartDate">{t('mandate_start_label')}</Label>
              <Controller
                name="mandateStartDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>{tCommon('pick_date')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.mandateStartDate && <p className="text-sm text-destructive mt-1">{errors.mandateStartDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="mandateEndDate">{t('mandate_end_label') || 'Mandate End Date'}</Label>
              <Controller
                name="mandateEndDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>{tCommon('pick_date')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.mandateEndDate && <p className="text-sm text-destructive mt-1">{errors.mandateEndDate.message}</p>}
            </div>
          </div>


          <Button type="submit" className="w-full py-3 text-base" disabled={isFormSubmitting || isSubmittingProp}>
            <Save className="mr-2 h-5 w-5" />
            {getButtonText()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
