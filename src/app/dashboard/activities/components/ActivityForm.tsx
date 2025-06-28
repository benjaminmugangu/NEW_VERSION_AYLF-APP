// src/app/dashboard/activities/components/ActivityForm.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Activity, ActivityFormData, Site, SmallGroup } from "@/lib/types";
import { mockSites, mockSmallGroups } from "@/lib/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, Activity as ActivityIconLucide } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/constants";

const activityFormSchema = z.object({
  name: z.string().min(3, "Activity name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  date: z.date({ required_error: "Activity date is required." }),
  status: z.enum(["planned", "executed", "cancelled"], { required_error: "Status is required." }),
  level: z.enum(["national", "site", "small_group"], { required_error: "Level is required." }),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
  participantsCount: z.coerce.number().int().min(0).optional().nullable(),
  imageUrl: z.string().url("Must be a valid URL.").optional().or(z.literal("")),
}).refine(data => {
  if (data.level === "site" && !data.siteId) return false;
  return true;
}, { message: "Site is required for site level activities.", path: ["siteId"] })
.refine(data => {
  if (data.level === "small_group" && (!data.siteId || !data.smallGroupId)) return false;
  return true;
}, { message: "Site and Small Group are required for small group level activities.", path: ["smallGroupId"] });


interface ActivityFormProps {
  activity?: Activity; // For editing
  onSubmitForm: (data: ActivityFormData) => Promise<void>;
}

export function ActivityForm({ activity, onSubmitForm }: ActivityFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [availableSites, setAvailableSites] = useState<Site[]>(mockSites);
  const [availableSmallGroups, setAvailableSmallGroups] = useState<SmallGroup[]>([]);

  const defaultValues = activity ? {
    ...activity,
    date: activity.date ? parseISO(activity.date) : new Date(),
    participantsCount: activity.participantsCount ?? undefined,
  } : {
    date: new Date(),
    status: "planned" as const,
    level: currentUser?.role === ROLES.NATIONAL_COORDINATOR ? "national" as const 
           : currentUser?.role === ROLES.SITE_COORDINATOR ? "site" as const 
           : "small_group" as const,
    siteId: currentUser?.role === ROLES.SITE_COORDINATOR ? currentUser.siteId : currentUser?.role === ROLES.SMALL_GROUP_LEADER ? currentUser.siteId : undefined,
    smallGroupId: currentUser?.role === ROLES.SMALL_GROUP_LEADER ? currentUser.smallGroupId : undefined,
    participantsCount: undefined,
    imageUrl: "",
  };

  const { control, handleSubmit, register, watch, formState: { errors, isSubmitting }, reset, setValue } = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues,
  });

  const watchedLevel = watch("level");
  const watchedSiteId = watch("siteId");

  useEffect(() => {
    if (currentUser?.role === ROLES.SITE_COORDINATOR) {
      setAvailableSites(mockSites.filter(s => s.id === currentUser.siteId));
      setValue("siteId", currentUser.siteId); 
    } else if (currentUser?.role === ROLES.SMALL_GROUP_LEADER) {
      setAvailableSites(mockSites.filter(s => s.id === currentUser.siteId));
      setValue("siteId", currentUser.siteId);
      setValue("smallGroupId", currentUser.smallGroupId);
    } else {
      setAvailableSites(mockSites);
    }
  }, [currentUser, setValue]);

  useEffect(() => {
    if (watchedSiteId) {
      setAvailableSmallGroups(mockSmallGroups.filter(sg => sg.siteId === watchedSiteId));
      if (currentUser?.role !== ROLES.SMALL_GROUP_LEADER || watchedSiteId !== currentUser?.siteId) {
        setValue("smallGroupId", undefined); // Reset if site changes unless it's the leader's own site
      }
    } else {
      setAvailableSmallGroups([]);
      setValue("smallGroupId", undefined);
    }
  }, [watchedSiteId, setValue, currentUser]);
  
  // Set initial small groups if editing or SG leader
   useEffect(() => {
    if (activity?.siteId) {
      setAvailableSmallGroups(mockSmallGroups.filter(sg => sg.siteId === activity.siteId));
    } else if (currentUser?.role === ROLES.SMALL_GROUP_LEADER && currentUser.siteId) {
      setAvailableSmallGroups(mockSmallGroups.filter(sg => sg.siteId === currentUser.siteId));
    }
  }, [activity, currentUser]);


  const processSubmit = async (data: ActivityFormData) => {
    await onSubmitForm(data);
    if (!activity) { // Reset form only if creating
      reset(defaultValues); // Reset to initial default values after successful creation
    }
  };
  
  const canChangeLevel = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSite = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const canChangeSmallGroup = currentUser?.role === ROLES.NATIONAL_COORDINATOR || (currentUser?.role === ROLES.SITE_COORDINATOR && watchedLevel === 'small_group');

  return (
    <Card className="shadow-xl w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <ActivityIconLucide className="mr-3 h-7 w-7 text-primary" />
          {activity ? "Edit Activity" : "Create New Activity"}
        </CardTitle>
        <CardDescription>
          {activity ? `Update details for "${activity.name}".` : "Fill in the details for the new activity."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Activity Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g., Annual Youth Summit" className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="Detailed description of the activity..." rows={4} className="mt-1" />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="date">Activity Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="status" className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="executed">Executed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-sm text-destructive mt-1">{errors.status.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <Label htmlFor="level">Level</Label>
              <Controller
                name="level"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      if (value === "national") {
                        setValue("siteId", undefined);
                        setValue("smallGroupId", undefined);
                      } else if (value === "site" && currentUser?.role !== ROLES.SITE_COORDINATOR) {
                         setValue("smallGroupId", undefined);
                      }
                  }} defaultValue={field.value} disabled={!canChangeLevel}>
                    <SelectTrigger id="level" className="mt-1">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">National</SelectItem>
                      <SelectItem value="site">Site</SelectItem>
                      <SelectItem value="small_group">Small Group</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.level && <p className="text-sm text-destructive mt-1">{errors.level.message}</p>}
            </div>
            <div>
                <Label htmlFor="participantsCount">Participants Count (Optional)</Label>
                <Input id="participantsCount" type="number" {...register("participantsCount")} placeholder="0" className="mt-1" />
                {errors.participantsCount && <p className="text-sm text-destructive mt-1">{errors.participantsCount.message}</p>}
            </div>
          </div>
          
          {watchedLevel === "site" || watchedLevel === "small_group" ? (
            <div>
              <Label htmlFor="siteId">Site</Label>
              <Controller
                name="siteId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      if (watchedLevel === "small_group" && currentUser?.role !== ROLES.SMALL_GROUP_LEADER) {
                          setValue("smallGroupId", undefined); // Reset small group if site changes
                      }
                  }} defaultValue={field.value} disabled={!canChangeSite}>
                    <SelectTrigger id="siteId" className="mt-1">
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.siteId && <p className="text-sm text-destructive mt-1">{errors.siteId.message}</p>}
            </div>
          ) : null}

          {watchedLevel === "small_group" && watchedSiteId ? (
            <div>
              <Label htmlFor="smallGroupId">Small Group</Label>
              <Controller
                name="smallGroupId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canChangeSmallGroup || availableSmallGroups.length === 0}>
                    <SelectTrigger id="smallGroupId" className="mt-1">
                      <SelectValue placeholder="Select small group" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSmallGroups.map(sg => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.smallGroupId && <p className="text-sm text-destructive mt-1">{errors.smallGroupId.message}</p>}
            </div>
          ) : null}

          <div>
            <Label htmlFor="imageUrl">Image URL (Optional)</Label>
            <Input id="imageUrl" {...register("imageUrl")} placeholder="https://example.com/image.jpg" className="mt-1" />
            {errors.imageUrl && <p className="text-sm text-destructive mt-1">{errors.imageUrl.message}</p>}
          </div>

          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? "Saving..." : (activity ? "Save Changes" : "Create Activity")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
