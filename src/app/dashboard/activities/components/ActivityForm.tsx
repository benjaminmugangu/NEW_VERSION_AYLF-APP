// src/app/dashboard/activities/components/ActivityForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { activityFormSchema, type ActivityFormData } from '@/services/activityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { activityService } from '@/services/activityService';
import { siteService } from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import type { Activity, Site, SmallGroup, ActivityType } from '@/lib/types';
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

interface ActivityFormProps {
  initialActivity?: Activity;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({ initialActivity, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!initialActivity;

  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [filteredSmallGroups, setFilteredSmallGroups] = useState<SmallGroup[]>([]);

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(), // Creation date, not shown in form
      executionDate: new Date(),
      status: 'planned',
      level: 'national',
      siteId: '',
      smallGroupId: '',
      participantsCount: undefined,
      imageUrl: '',
      activityTypeId: '',
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
        executionDate: initialActivity.executionDate ? new Date(initialActivity.executionDate) : new Date(),
        siteId: initialActivity.siteId ?? '',
        smallGroupId: initialActivity.smallGroupId ?? '',
        participantsCount: initialActivity.participantsCount ?? undefined,
        imageUrl: initialActivity.imageUrl ?? '',
        activityTypeId: initialActivity.activityTypeId ?? '',
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
        // Always fetch activity types
        const activityTypesData = await activityService.getActivityTypes();
        setActivityTypes(activityTypesData);

        // Conditionally fetch data based on role
        if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
          const [siteResponse, smallGroupResponse] = await Promise.all([
            siteService.getSitesWithDetails(currentUser),
            smallGroupService.getFilteredSmallGroups({ user: currentUser })
          ]);
          if (siteResponse.success) setSites(siteResponse.data || []);
          if (smallGroupResponse.success) setSmallGroups(smallGroupResponse.data || []);
        } else if (currentUser.role === ROLES.SITE_COORDINATOR) {
          // A site coordinator might need to see their own site's small groups
          const smallGroupResponse = await smallGroupService.getFilteredSmallGroups({ user: currentUser });
          if (smallGroupResponse.success) setSmallGroups(smallGroupResponse.data || []);
        }

      } catch (error) {
        console.error('Failed to fetch form data:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load necessary data.' });
      }
    };
    fetchData();
  }, [currentUser, toast]);

  useEffect(() => {
    if (selectedSiteId) {
      setFilteredSmallGroups(smallGroups.filter(sg => sg.siteId === selectedSiteId));
    } else {
      setFilteredSmallGroups([]);
    }
  }, [selectedSiteId, smallGroups]);

  const onSubmit = async (data: ActivityFormData) => {
    try {
      let savedActivity;
      const payload = {
        ...data,
        siteId: data.siteId || undefined,
        smallGroupId: data.smallGroupId || undefined,
        activityTypeId: data.activityTypeId || undefined,
      };

      if (isEditMode && initialActivity?.id) {
        savedActivity = await activityService.updateActivity(initialActivity.id, payload);
        toast({ title: 'Success', description: 'Activity updated successfully.' });
      } else {
        savedActivity = await activityService.createActivity(payload, currentUser!.id);
        toast({ title: 'Success', description: 'Activity created successfully.' });
      }
      onSave(savedActivity);
    } catch (error: any) {
      console.error('Failed to save activity:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save activity.' });
    }
  };
  
  const handleStartActivity = async () => {
    if (!initialActivity?.id) return;
    try {
      const updatedActivity = await activityService.updateActivityStatus(initialActivity.id, 'in_progress');
      onSave(updatedActivity);
      toast({ title: 'Activity Started', description: 'The activity is now in progress.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to start activity: ${error.message}` });
    }
  };

  const canChangeLevel = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSite = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSmallGroup = currentUser?.role !== ROLES.SMALL_GROUP_LEADER;

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">{initialActivity ? 'Edit Activity' : 'Create New Activity'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title">Activity Title <span className="text-destructive">*</span></Label>
              <Input id="title" {...form.register('title')} className="mt-1" placeholder="e.g., National Youth Conference" />
              {form.formState.errors.title && <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="executionDate">Execution Date <span className="text-destructive">*</span></Label>
              <Controller name="executionDate" control={form.control} render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
              )} />
              {form.formState.errors.executionDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.executionDate.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register('description')} className="mt-1" placeholder="Provide a detailed description of the activity..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="level">Level</Label>
              <Controller name="level" control={form.control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={!canChangeLevel}>
                  <SelectTrigger id="level" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="small_group">Small Group</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            
            {selectedLevel === 'site' || selectedLevel === 'small_group' ? (
              <div>
                <Label htmlFor="siteId">Site</Label>
                <Controller name="siteId" control={form.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canChangeSite}>
                    <SelectTrigger id="siteId" className="mt-1"><SelectValue placeholder="Select site" /></SelectTrigger>
                    <SelectContent>
                      {sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {form.formState.errors.siteId && <p className="text-sm text-destructive mt-1">{form.formState.errors.siteId.message}</p>}
              </div>
            ) : <div />} 

            {selectedLevel === 'small_group' ? (
              <div>
                <Label htmlFor="smallGroupId">Small Group</Label>
                <Controller name="smallGroupId" control={form.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedSiteId || !canChangeSmallGroup}>
                    <SelectTrigger id="smallGroupId" className="mt-1"><SelectValue placeholder="Select small group" /></SelectTrigger>
                    <SelectContent>
                      {filteredSmallGroups.map(sg => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {form.formState.errors.smallGroupId && <p className="text-sm text-destructive mt-1">{form.formState.errors.smallGroupId.message}</p>}
              </div>
            ) : <div />} 
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="activityTypeId">Activity Type</Label>
              <Controller name="activityTypeId" control={form.control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <SelectTrigger id="activityTypeId" className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {activityTypes.map(type => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <Label htmlFor="participantsCount">Participants Count</Label>
              <Input id="participantsCount" type="number" {...form.register('participantsCount')} className="mt-1" placeholder="e.g., 50" />
            </div>
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" {...form.register('imageUrl')} className="mt-1" placeholder="https://example.com/image.png" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <div>
              {isEditMode && initialActivity?.status === 'planned' && (
                <Button type="button" variant="secondary" onClick={handleStartActivity}>
                  <ActivityIconLucide className="mr-2 h-5 w-5" />
                  Start Activity
                </Button>
              )}
            </div>
            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                  <XCircle className="mr-2 h-5 w-5" />
                  Cancel
              </Button>
              <Button type="submit" className="text-base" disabled={form.formState.isSubmitting}>
                  <Save className="mr-2 h-5 w-5" />
                  {form.formState.isSubmitting ? 'Saving...' : (initialActivity ? 'Save Changes' : 'Create Activity')}
              </Button>
            </div>
        </CardFooter>
      </form>
    </Card>
  );
};
