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
import siteService from '@/services/siteService';
import { smallGroupService } from '@/services/smallGroupService';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@/lib/constants";

const memberFormSchema = z.object({
  name: z.string().min(3, "Member name must be at least 3 characters."),
  gender: z.enum(["male", "female"]),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address.").optional(),
  type: z.enum(["student", "non-student"], { required_error: "Member type is required." }),
  joinDate: z.date({ required_error: "Join date is required." }),
  level: z.enum(["national", "site", "small_group"], { required_error: "Level is required." }),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
}).refine(data => {
  if (data.level === 'site' && !data.siteId) return false;
  return true;
}, { message: "Site is required for site-level members.", path: ["siteId"] })
.refine(data => {
  if (data.level === 'small_group' && !data.smallGroupId) return false;
  return true;
}, { message: "Small group is required for small group level members.", path: ["smallGroupId"] });

interface MemberFormProps {
  member?: Member;
  onSubmitForm: (data: MemberFormData) => Promise<void>;
}

export function MemberForm({ member, onSubmitForm }: MemberFormProps) {
  const { currentUser } = useAuth();

  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);

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
      if (currentUser?.role === ROLES.NATIONAL_COORDINATOR) {
        try {
          const sitesData = await siteService.getSitesWithDetails(currentUser);
          setSites(sitesData);
        } catch (error) {
          console.error('Failed to fetch sites:', error);
          setSites([]);
        }
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
          {member ? "Edit Member" : "Add New Member"}
        </CardTitle>
        <CardDescription>
          {member ? `Update details for ${member.name}.` : "Fill in the details for the new member."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g., John Doe" className="mt-1" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} className="mt-1" placeholder="member@example.com" />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register("phone")} className="mt-1" placeholder="+243 ..." />
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="gender" className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>}
            </div>
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

          <div>
            <Label htmlFor="level">Level</Label>
            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!canChangeLevel}>
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

          {(watchedLevel === 'site' || watchedLevel === 'small_group') && (
            <div>
              <Label htmlFor="siteId">Site</Label>
              <Controller
                name="siteId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canChangeSite}>
                    <SelectTrigger id="siteId" className="mt-1">
                      <SelectValue placeholder="Select site" />
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
              <Label htmlFor="smallGroupId">Small Group</Label>
              <Controller
                name="smallGroupId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canChangeSmallGroup || !watchedSiteId}>
                    <SelectTrigger id="smallGroupId" className="mt-1">
                      <SelectValue placeholder="Select small group" />
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
            {isSubmitting ? "Saving..." : (member ? "Save Changes" : "Add Member")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
