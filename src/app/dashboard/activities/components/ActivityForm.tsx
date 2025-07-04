// src/app/dashboard/activities/components/ActivityForm.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Save, Activity as ActivityIconLucide, XCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/constants';
import type { Activity, ActivityFormData, ServiceResponse, Site, SmallGroup } from '@/lib/types';
import activityService from '@/services/activityService';
import siteService from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';

const activityFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long.'),
  description: z.string().optional(),
  date: z.date({ required_error: 'A date is required.' }),
  status: z.enum(['planned', 'executed', 'cancelled']),
  level: z.enum(['national', 'site', 'small_group']),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
  participantsCount: z.coerce.number().int().min(0).optional().nullable(),
  imageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal(''))
}).refine(data => {
  if (data.level === 'site' && !data.siteId) return false;
  return true;
}, { message: 'Site is required for site level activities.', path: ['siteId'] })
.refine(data => {
  if (data.level === 'small_group' && !data.smallGroupId) return false;
  return true;
}, { message: 'Small Group is required for small group level activities.', path: ['smallGroupId'] });

type ActivityFormValues = z.infer<typeof activityFormSchema>;

interface ActivityFormProps {
  initialActivity?: Activity;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}

export function ActivityForm({ initialActivity, onSave, onCancel }: ActivityFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);

  const defaultValues = useMemo((): ActivityFormValues => {
    if (initialActivity) {
      const date = initialActivity.date && isValid(parseISO(initialActivity.date)) ? parseISO(initialActivity.date) : new Date();
      return {
        name: initialActivity.name,
        description: initialActivity.description ?? '',
        date: date,
        status: initialActivity.status,
        level: initialActivity.level,
        siteId: initialActivity.siteId ?? undefined,
        smallGroupId: initialActivity.smallGroupId ?? undefined,
        participantsCount: initialActivity.participantsCount ?? null,
        imageUrl: initialActivity.imageUrl ?? '',
      };
    }

    const baseValues = {
        name: '',
        description: '',
        date: new Date(),
        status: 'planned' as const,
        participantsCount: 0,
        imageUrl: '',
        siteId: undefined,
        smallGroupId: undefined,
    };

    if (currentUser) {
      return {
        ...baseValues,
        level: currentUser.role === ROLES.NATIONAL_COORDINATOR ? 'national' : currentUser.role === ROLES.SITE_COORDINATOR ? 'site' : 'small_group',
        siteId: currentUser.siteId ?? undefined,
        smallGroupId: currentUser.smallGroupId ?? undefined,
      };
    }
    
    return {
        ...baseValues,
        level: 'national',
    };
  }, [initialActivity, currentUser]);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues,
    resetOptions: { keepDirtyValues: true },
  });

  const watchedLevel = form.watch('level');
  const watchedSiteId = form.watch('siteId');

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form.reset]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!currentUser) return;

      const sitesResponse = await siteService.getAllSites();
      if (sitesResponse.success && sitesResponse.data) {
        setSites(sitesResponse.data);
      }

      if (watchedLevel === 'small_group' && watchedSiteId) {
        const smallGroupsResponse = await smallGroupService.getSmallGroups({ siteId: watchedSiteId });
        if (smallGroupsResponse.success && smallGroupsResponse.data) {
          setSmallGroups(smallGroupsResponse.data);
        } else {
          setSmallGroups([]);
        }
      } else {
        setSmallGroups([]);
      }
    };
    fetchDropdownData();
  }, [currentUser, watchedLevel, watchedSiteId]);

  const onSubmit = async (values: ActivityFormValues) => {
    const activityData: ActivityFormData = {
      ...values,
      date: values.date.toISOString(),
      description: values.description ?? '',
      participantsCount: values.participantsCount ?? 0,
    };

    let response: ServiceResponse<Activity>;
    if (initialActivity?.id) {
      response = await activityService.updateActivity(initialActivity.id, activityData);
    } else {
      response = await activityService.createActivity(activityData);
    }

    if (response.success && response.data) {
      toast({ title: 'Success', description: `Activity successfully ${initialActivity ? 'updated' : 'created'}.` });
      onSave(response.data);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: response.error?.message || 'An unknown error occurred.' });
    }
  };

  if (!currentUser) {
    return (
      <Card className="shadow-xl w-full max-w-2xl mx-auto">
        <CardHeader><CardTitle>Loading...</CardTitle></CardHeader>
        <CardContent><p>Loading user information...</p></CardContent>
      </Card>
    );
  }

  const canChangeLevel = currentUser.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSite = currentUser.role === ROLES.NATIONAL_COORDINATOR;

  return (
    <Card className="shadow-xl w-full max-w-2xl mx-auto">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ActivityIconLucide className="mr-3 h-7 w-7 text-primary" />
            {initialActivity ? 'Edit Activity' : 'Create New Activity'}
          </CardTitle>
          <CardDescription>
            {initialActivity ? `Update details for "${initialActivity.name}".` : 'Fill in the details for the new activity.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="name">Activity Name</Label>
                <Input id="name" {...form.register("name")} placeholder="e.g., Annual Leadership Conference" className="mt-1" />
                {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>

            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...form.register("description")} placeholder="Describe the activity's purpose, goals, and details." className="mt-1" />
                {form.formState.errors.description && <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="date">Activity Date</Label>
                    <Controller name="date" control={form.control} render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                    )} />
                    {form.formState.errors.date && <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>}
                </div>
                <div>
                    <Label htmlFor="status">Status</Label>
                    <Controller name="status" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger id="status" className="mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="planned">Planned</SelectItem>
                                <SelectItem value="executed">Executed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    )} />
                    {form.formState.errors.status && <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="level">Level</Label>
                    <Controller name="level" control={form.control} render={({ field }) => (
                        <Select onValueChange={(value) => { field.onChange(value); form.setValue('siteId', undefined); form.setValue('smallGroupId', undefined); }} defaultValue={field.value} disabled={!canChangeLevel}>
                            <SelectTrigger id="level" className="mt-1"><SelectValue placeholder="Select level" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="national">National</SelectItem>
                                <SelectItem value="site">Site</SelectItem>
                                <SelectItem value="small_group">Small Group</SelectItem>
                            </SelectContent>
                        </Select>
                    )} />
                    {form.formState.errors.level && <p className="text-sm text-destructive mt-1">{form.formState.errors.level.message}</p>}
                </div>
                <div>
                    <Label htmlFor="participantsCount">Participants Count</Label>
                    <Input id="participantsCount" type="number" {...form.register("participantsCount")} placeholder="0" className="mt-1" />
                    {form.formState.errors.participantsCount && <p className="text-sm text-destructive mt-1">{form.formState.errors.participantsCount.message}</p>}
                </div>
            </div>

            {(watchedLevel === 'site' || watchedLevel === 'small_group') && (
                <div>
                    <Label htmlFor="siteId">Site</Label>
                    <Controller name="siteId" control={form.control} render={({ field }) => (
                        <Select onValueChange={(value) => { field.onChange(value); form.setValue('smallGroupId', undefined); }} defaultValue={field.value} disabled={!canChangeSite}>
                            <SelectTrigger id="siteId" className="mt-1"><SelectValue placeholder="Select site" /></SelectTrigger>
                            <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                    )} />
                    {form.formState.errors.siteId && <p className="text-sm text-destructive mt-1">{form.formState.errors.siteId.message}</p>}
                </div>
            )}

            {watchedLevel === 'small_group' && (
                <div>
                    <Label htmlFor="smallGroupId">Small Group</Label>
                    <Controller name="smallGroupId" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchedSiteId || smallGroups.length === 0}>
                            <SelectTrigger id="smallGroupId" className="mt-1"><SelectValue placeholder="Select small group" /></SelectTrigger>
                            <SelectContent>{smallGroups.map(sg => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}</SelectContent>
                        </Select>
                    )} />
                    {form.formState.errors.smallGroupId && <p className="text-sm text-destructive mt-1">{form.formState.errors.smallGroupId.message}</p>}
                </div>
            )}

            <div>
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <Input id="imageUrl" {...form.register("imageUrl")} placeholder="https://example.com/image.jpg" className="mt-1" />
                {form.formState.errors.imageUrl && <p className="text-sm text-destructive mt-1">{form.formState.errors.imageUrl.message}</p>}
            </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
                <XCircle className="mr-2 h-5 w-5" />
                Cancel
            </Button>
            <Button type="submit" className="text-base" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-5 w-5" />
                {form.formState.isSubmitting ? 'Saving...' : (initialActivity ? 'Save Changes' : 'Create Activity')}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
