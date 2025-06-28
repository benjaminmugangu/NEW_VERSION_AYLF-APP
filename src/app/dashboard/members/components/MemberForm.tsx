// src/app/dashboard/members/components/MemberForm.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Member, MemberFormData, Site, SmallGroup } from "@/lib/types";
import { mockSites, mockSmallGroups } from "@/lib/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/constants";

const memberFormSchema = z.object({
  name: z.string().min(3, "Member name must be at least 3 characters."),
  type: z.enum(["student", "non-student"], { required_error: "Member type is required." }),
  joinDate: z.date({ required_error: "Join date is required." }),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
}).refine(data => { // Site is required if small group is selected
  if (data.smallGroupId && !data.siteId) return false;
  return true;
}, { message: "Site selection is required if a small group is selected.", path: ["siteId"]});

const NO_SITE_VALUE = "__NO_SITE_VALUE__";
const NO_SMALL_GROUP_VALUE = "__NO_SMALL_GROUP_VALUE__";

interface MemberFormProps {
  member?: Member; // For editing
  onSubmitForm: (data: MemberFormData) => Promise<void>;
}

export function MemberForm({ member, onSubmitForm }: MemberFormProps) {
  const { currentUser } = useAuth();
  const [availableSites, setAvailableSites] = useState<Site[]>(mockSites);
  const [availableSmallGroups, setAvailableSmallGroups] = useState<SmallGroup[]>([]);

  const defaultValues = member ? {
    ...member,
    joinDate: member.joinDate ? parseISO(member.joinDate) : new Date(),
  } : {
    joinDate: new Date(),
    type: "student" as const,
    siteId: currentUser?.role === ROLES.SITE_COORDINATOR ? currentUser.siteId : currentUser?.role === ROLES.SMALL_GROUP_LEADER ? currentUser.siteId : undefined,
    smallGroupId: currentUser?.role === ROLES.SMALL_GROUP_LEADER ? currentUser.smallGroupId : undefined,
  };

  const { control, handleSubmit, register, watch, formState: { errors, isSubmitting }, reset, setValue } = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues,
  });

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
         setValue("smallGroupId", undefined); // Reset small group if site changes unless it's the leader's own site/sg
      }
    } else {
      setAvailableSmallGroups([]);
      setValue("smallGroupId", undefined);
    }
  }, [watchedSiteId, setValue, currentUser]);

  // Set initial small groups if editing or SG leader
   useEffect(() => {
    if (member?.siteId) {
      setAvailableSmallGroups(mockSmallGroups.filter(sg => sg.siteId === member.siteId));
    } else if (currentUser?.role === ROLES.SMALL_GROUP_LEADER && currentUser.siteId) {
      setAvailableSmallGroups(mockSmallGroups.filter(sg => sg.siteId === currentUser.siteId));
    }
  }, [member, currentUser]);


  const processSubmit = async (data: MemberFormData) => {
    await onSubmitForm(data);
    if (!member) {
      reset(defaultValues);
    }
  };

  const canChangeSite = currentUser?.role === ROLES.NATIONAL_COORDINATOR || currentUser?.role === ROLES.SITE_COORDINATOR;
  const canChangeSmallGroup = currentUser?.role === ROLES.NATIONAL_COORDINATOR || currentUser?.role === ROLES.SITE_COORDINATOR || currentUser?.role === ROLES.SMALL_GROUP_LEADER;


  return (
    <Card className="shadow-xl w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <UserPlus className="mr-3 h-7 w-7 text-primary" />
          {member ? "Edit Member" : "Add New Member"}
        </CardTitle>
        <CardDescription>
          {member ? `Update details for ${member.name}.` : "Fill in the details for the new member."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g., John Doe" className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="type">Member Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="type" className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="non-student">Non-Student</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <Label htmlFor="joinDate">Join Date</Label>
              <Controller
                name="joinDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal mt-1",!field.value && "text-muted-foreground")}
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
              {errors.joinDate && <p className="text-sm text-destructive mt-1">{errors.joinDate.message}</p>}
            </div>
          </div>
          
          <div>
            <Label htmlFor="siteId">Site (Optional)</Label>
            <Controller
              name="siteId"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(valueFromSelect) => {
                    const actualValueToSet = valueFromSelect === NO_SITE_VALUE ? undefined : valueFromSelect;
                    field.onChange(actualValueToSet);
                    if (currentUser?.role !== ROLES.SMALL_GROUP_LEADER || actualValueToSet !== currentUser.siteId) {
                       setValue("smallGroupId", undefined);
                    }
                  }} 
                  value={field.value ?? ""} 
                  disabled={!canChangeSite}
                >
                  <SelectTrigger id="siteId" className="mt-1">
                    <SelectValue placeholder="Select site (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SITE_VALUE}>No Specific Site</SelectItem>
                    {availableSites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.siteId && <p className="text-sm text-destructive mt-1">{errors.siteId.message}</p>}
          </div>

          {watchedSiteId && (
            <div>
              <Label htmlFor="smallGroupId">Small Group (Optional)</Label>
              <Controller
                name="smallGroupId"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={(valueFromSelect) => {
                       const actualValueToSet = valueFromSelect === NO_SMALL_GROUP_VALUE ? undefined : valueFromSelect;
                       field.onChange(actualValueToSet);
                    }} 
                    value={field.value ?? ""} 
                    disabled={!canChangeSmallGroup || availableSmallGroups.length === 0}>
                    <SelectTrigger id="smallGroupId" className="mt-1">
                      <SelectValue placeholder="Select small group (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SMALL_GROUP_VALUE}>No Specific Small Group</SelectItem>
                      {availableSmallGroups.map(sg => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.smallGroupId && <p className="text-sm text-destructive mt-1">{errors.smallGroupId.message}</p>}
            </div>
          )}

          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? "Saving..." : (member ? "Save Changes" : "Add Member")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
