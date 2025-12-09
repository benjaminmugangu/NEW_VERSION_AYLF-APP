"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { activityFormSchema, type ActivityFormData } from '@/schemas/activity';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import * as activityService from '@/services/activityService';
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';
import type { Activity, Site, SmallGroup } from '@/lib/types';
import { ActivityTypeEnum } from '@prisma/client';
import { ROLES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Save, XCircle, Activity as ActivityIconLucide } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ActivityFormProps {
  initialActivity?: Activity;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({ initialActivity, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!initialActivity;
  const t = useTranslations('ActivityForm');
  const tStatus = useTranslations('ActivityStatus');
  const tLevel = useTranslations('ActivityLevel');

  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [filteredSmallGroups, setFilteredSmallGroups] = useState<SmallGroup[]>([]);

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: '',
      thematic: '',
      date: new Date(),
      status: 'planned',
      level: 'national',
      siteId: '',
      smallGroupId: '',
      participantsCountPlanned: 0,
      activityTypeEnum: 'small_group_meeting',
      createdBy: currentUser?.id || '',
    },
  });

  const selectedLevel = form.watch('level');
  const selectedSiteId = form.watch('siteId');

  useEffect(() => {
    const determinedLevel = currentUser?.role === ROLES.NATIONAL_COORDINATOR ? 'national' : currentUser?.role === ROLES.SITE_COORDINATOR ? 'site' : 'small_group';

    if (isEditMode && initialActivity) {
      form.reset({
        ...initialActivity,
        date: new Date(initialActivity.date),
        siteId: initialActivity.siteId ?? '',
        smallGroupId: initialActivity.smallGroupId ?? '',
        participantsCountPlanned: initialActivity.participantsCountPlanned ?? 0,
        activityTypeEnum: (initialActivity as any).activityTypeEnum ?? 'small_group_meeting',
        createdBy: initialActivity.createdBy || currentUser?.id || '',
      });
    } else if (!isEditMode && currentUser) {
      form.setValue('level', determinedLevel);
      if (currentUser.siteId) form.setValue('siteId', currentUser.siteId);
      if (currentUser.smallGroupId) form.setValue('smallGroupId', currentUser.smallGroupId);
    }
  }, [initialActivity, isEditMode, currentUser, form]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
          const sitesData = await siteService.getSitesWithDetails(currentUser);
          setSites(sitesData);
          const smallGroupsData = await smallGroupService.getFilteredSmallGroups({ user: currentUser });
          setSmallGroups(smallGroupsData);
        } else if (currentUser.role === ROLES.SITE_COORDINATOR && currentUser.siteId) {
          const siteData = await siteService.getSiteById(currentUser.siteId);
          if (siteData) setSites([siteData]);
          const smallGroupsData = await smallGroupService.getSmallGroupsBySite(currentUser.siteId);
          setSmallGroups(smallGroupsData);
        } else if (currentUser.role === ROLES.SMALL_GROUP_LEADER && currentUser.smallGroupId) {
          const smallGroupData = await smallGroupService.getSmallGroupById(currentUser.smallGroupId);
          if (smallGroupData) {
            setSmallGroups([smallGroupData]);
            const siteData = await siteService.getSiteById(smallGroupData.siteId);
            if (siteData) setSites([siteData]);
          }
        }
      } catch (error) {
        console.error("Error fetching data for activity form:", error);
        toast({ title: 'Error', description: t('error_fetch'), variant: 'destructive' });
      }
    };
    fetchData();
  }, [currentUser, toast, t]);

  useEffect(() => {
    if (selectedSiteId) {
      const filtered = smallGroups.filter(sg => sg.siteId === selectedSiteId);
      setFilteredSmallGroups(filtered);
    } else {
      setFilteredSmallGroups([]);
    }
  }, [selectedSiteId, smallGroups]);

  const onSubmit = async (data: ActivityFormData) => {
    if (!currentUser?.id) {
      toast({ title: 'Error', description: t('error_login'), variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        ...data,
        siteId: data.level === 'national' ? undefined : data.siteId,
        smallGroupId: data.level !== 'small_group' ? undefined : data.smallGroupId,
        participantsCountPlanned: Number(data.participantsCountPlanned) || 0,
        createdBy: data.createdBy,
      };

      let savedActivity;
      if (isEditMode && initialActivity?.id) {
        savedActivity = await activityService.updateActivity(initialActivity.id, payload);
      } else {
        savedActivity = await activityService.createActivity(payload);
      }
      toast({ title: 'Success', description: isEditMode ? t('success_updated') : t('success_created') });
      if (savedActivity) onSave(savedActivity);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Error', description: `${t('error_save')}: ${errorMessage}`, variant: 'destructive' });
    }
  };

  const handleStartActivity = async () => {
    if (!initialActivity) return;
    try {
      const updatedActivity = await activityService.updateActivity(initialActivity.id, { status: 'executed' });
      toast({
        title: 'Activity Marked as Executed',
        description: `Activity "${updatedActivity.title}" is now in executed status.`,
      });
      onSave(updatedActivity);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        title: 'Error',
        description: `Failed to mark activity as executed: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const canChangeLevel = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSite = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSmallGroup = !!currentUser?.role && [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR].includes(currentUser.role);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

      {/* Header / Actions - Mobile Friendly */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{isEditMode ? t('title_edit') : t('title_create')}</h2>
          <p className="text-muted-foreground">{isEditMode ? "Modify details of an existing activity" : "Fill in the details to plan a new activity"}</p>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            <XCircle className="mr-2 h-4 w-4" />
            {t('cancel')}
          </Button>
          <Button type="submit" className="flex-1 sm:flex-none" disabled={form.formState.isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {form.formState.isSubmitting ? t('saving') : (initialActivity ? t('save_changes') : t('create_activity'))}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Column: Core Information (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations Principales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input type="hidden" {...form.register('createdBy')} />
              <div>
                <Label htmlFor="title">{t('title_label')}</Label>
                <Input id="title" {...form.register('title')} className="mt-1" placeholder={t('title_placeholder')} />
                {form.formState.errors.title && <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>}
              </div>

              <div>
                <Label htmlFor="thematic">{t('thematic_label')}</Label>
                <Textarea id="thematic" {...form.register('thematic')} className="mt-1 min-h-[120px]" placeholder={t('thematic_placeholder')} />
              </div>
            </CardContent>
          </Card>

          {/* Activity Status / Execution (Visible only if Edit Mode) */}
          {/* If we strictly follow the plan, Status might be better in the sidebar, but 'Execution actions' are main actions */}
          {isEditMode && initialActivity?.status === 'planned' && (
            <Card className="bg-muted/30 border-dashed">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button type="button" variant="secondary" onClick={handleStartActivity} className="w-full sm:w-auto">
                  <ActivityIconLucide className="mr-2 h-4 w-4" />
                  {t('mark_executed')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Column: Logistics & Meta (1/3) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails Logistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Status */}
              <div>
                <Label htmlFor="status">{t('status_label')}</Label>
                <Controller name="status" control={form.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <SelectTrigger id="status" className="mt-1"><SelectValue placeholder={t('status_placeholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">{tStatus("planned")}</SelectItem>
                      <SelectItem value="executed">{tStatus("executed")}</SelectItem>
                      <SelectItem value="canceled">{tStatus("canceled")}</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>

              {/* Date */}
              <div>
                <Label htmlFor="date">{t('date_label')}</Label>
                <Controller name="date" control={form.control} render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), 'PPP') : <span>{t('pick_date')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )} />
                {form.formState.errors.date && <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>}
              </div>

              {/* Activity Type */}
              <div>
                <Label htmlFor="activityTypeEnum">{t('type_label')}</Label>
                <Controller name="activityTypeEnum" control={form.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger id="activityTypeEnum" className="mt-1"><SelectValue placeholder={t('type_placeholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small_group_meeting">{t('types.small_group_meeting')}</SelectItem>
                      <SelectItem value="conference">{t('types.conference')}</SelectItem>
                      <SelectItem value="apostolat">{t('types.apostolat')}</SelectItem>
                      <SelectItem value="deuil">{t('types.deuil')}</SelectItem>
                      <SelectItem value="other">{t('types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {form.formState.errors.activityTypeEnum && <p className="text-sm text-destructive mt-1">{(form.formState.errors.activityTypeEnum as any).message}</p>}
              </div>

              {/* Participants */}
              <div>
                <Label htmlFor="participantsCountPlanned">{t('participants_label')}</Label>
                <Input id="participantsCountPlanned" type="number" {...form.register('participantsCountPlanned', { valueAsNumber: true })} className="mt-1" placeholder={t('participants_placeholder')} />
                {form.formState.errors.participantsCountPlanned && <p className="text-sm text-destructive mt-1">{form.formState.errors.participantsCountPlanned.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contexte Org.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Level */}
              <div>
                <Label htmlFor="level">{t('level_label')}</Label>
                <Controller name="level" control={form.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={!canChangeLevel}>
                    <SelectTrigger id="level" className="mt-1"><SelectValue placeholder={t('level_placeholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">{tLevel("national")}</SelectItem>
                      <SelectItem value="site">{tLevel("site")}</SelectItem>
                      <SelectItem value="small_group">{tLevel("small_group")}</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>

              {/* Site Selector */}
              {selectedLevel === 'site' || selectedLevel === 'small_group' ? (
                <div>
                  <Label htmlFor="siteId">{t('site_label')}</Label>
                  <Controller name="siteId" control={form.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canChangeSite}>
                      <SelectTrigger id="siteId" className="mt-1"><SelectValue placeholder={t('site_placeholder')} /></SelectTrigger>
                      <SelectContent>
                        {sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                  {form.formState.errors.siteId && <p className="text-sm text-destructive mt-1">{form.formState.errors.siteId.message}</p>}
                </div>
              ) : null}

              {/* Small Group Selector */}
              {selectedLevel === 'small_group' ? (
                <div>
                  <Label htmlFor="smallGroupId">{t('small_group_label')}</Label>
                  <Controller name="smallGroupId" control={form.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedSiteId || !canChangeSmallGroup}>
                      <SelectTrigger id="smallGroupId" className="mt-1"><SelectValue placeholder={t('small_group_placeholder')} /></SelectTrigger>
                      <SelectContent>
                        {filteredSmallGroups.map(sg => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                  {form.formState.errors.smallGroupId && <p className="text-sm text-destructive mt-1">{form.formState.errors.smallGroupId.message}</p>}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

      </div>
    </form>
  );
};
