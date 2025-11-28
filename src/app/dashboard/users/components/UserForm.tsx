// src/app/dashboard/users/components/UserForm.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../../../../contexts/AuthContext";
import type { User, UserRole, Site, SmallGroup } from "@/lib/types";
import { ROLES } from "@/lib/constants";
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, UserPlus, UsersRound } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { refinedUserFormSchema, type UserFormData } from "@/schemas/user";

interface UserFormProps {
  user?: User;
  onSubmitForm: (data: UserFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function UserForm({ user, onSubmitForm, isSubmitting: isSubmittingProp }: UserFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [availableSmallGroups, setAvailableSmallGroups] = useState<SmallGroup[]>([]);

  const defaultValues: Partial<UserFormData> = user ? {
    ...user,
    mandateStartDate: user.mandateStartDate ? parseISO(user.mandateStartDate) : undefined,
    mandateEndDate: user.mandateEndDate ? parseISO(user.mandateEndDate) : undefined,
    status: user.status || "active",
  } : {
    name: '',
    email: '',
    role: ROLES.SMALL_GROUP_LEADER as UserRole,
    mandateStartDate: new Date(),
    status: "active" as const,
    siteId: null,
    smallGroupId: null,
  };

  const { control, handleSubmit, register, watch, formState: { errors, isSubmitting: isFormSubmitting }, reset, setValue } = useForm<UserFormData>({
    resolver: zodResolver(refinedUserFormSchema),
    defaultValues,
  });

  const watchedRole = watch("role");
  const watchedSiteId = watch("siteId");

  // Define visibility based on the selected role
  const showSiteField = watchedRole === ROLES.SITE_COORDINATOR || watchedRole === ROLES.SMALL_GROUP_LEADER;
  const showSmallGroupField = watchedRole === ROLES.SMALL_GROUP_LEADER;

  // Fetch sites when component mounts or user changes
  useEffect(() => {
    const fetchSites = async () => {
      try {
        if (currentUser) {
          const sites = await siteService.getSitesWithDetails(currentUser);
          setAvailableSites(sites);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast({ title: 'Error loading sites', description: message, variant: 'destructive' });
      }
    };
    fetchSites();
  }, [currentUser, toast]);

  // Reset dependent fields when role changes
  useEffect(() => {
    if (!showSiteField) {
      setValue("siteId", null);
    }
    if (!showSmallGroupField) {
      setValue("smallGroupId", null);
    }
  }, [watchedRole, showSiteField, showSmallGroupField, setValue]);

  // Fetch small groups when site selection changes
  useEffect(() => {
    const fetchSmallGroups = async () => {
      if (watchedSiteId && watchedRole === ROLES.SMALL_GROUP_LEADER) {
        try {
          const smallGroups = await smallGroupService.getSmallGroupsBySite(watchedSiteId);
          setAvailableSmallGroups(smallGroups);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          toast({ title: 'Error loading small groups', description: message, variant: 'destructive' });
          setAvailableSmallGroups([]);
        }

        // Reset small group selection if the site changes
        if (!user || watchedSiteId !== user.siteId) {
          setValue("smallGroupId", null);
        }
      } else {
        setAvailableSmallGroups([]);
      }
    };
    fetchSmallGroups();
  }, [watchedSiteId, watchedRole, user, setValue, toast]);

  const processSubmit = async (data: UserFormData) => {
    await onSubmitForm(data);
    if (!user) {
      reset(defaultValues);
    }
  };

  return (
    <Card className="shadow-xl w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <UsersRound className="mr-3 h-7 w-7 text-primary" />
          {user ? "Edit User" : "Add New User"}
        </CardTitle>
        <CardDescription>
          {user ? `Update details for ${user.name}.` : "Fill in the details for the new user."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g., Jane Doe" className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" {...register("email")} placeholder="user@example.com" className="mt-1" />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="role" className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROLES.NATIONAL_COORDINATOR}>National Coordinator</SelectItem>
                      <SelectItem value={ROLES.SITE_COORDINATOR}>Site Coordinator</SelectItem>
                      <SelectItem value={ROLES.SMALL_GROUP_LEADER}>Small Group Leader</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || "active"}>
                    <SelectTrigger id="status" className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-sm text-destructive mt-1">{errors.status.message}</p>}
            </div>
          </div>

          {showSiteField && (
            <div>
              <Label htmlFor="siteId">Assigned Site</Label>
              <Controller
                name="siteId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={availableSites.length === 0}>
                    <SelectTrigger id="siteId" className="mt-1">
                      <SelectValue placeholder="Select a site" />
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
              <Label htmlFor="smallGroupId">Assigned Small Group</Label>
              <Controller
                name="smallGroupId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={!watchedSiteId || availableSmallGroups.length === 0}>
                    <SelectTrigger id="smallGroupId" className="mt-1">
                      <SelectValue placeholder={watchedSiteId ? "Select small group" : "Select a site first"} />
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
              <Label htmlFor="mandateStartDate">Mandate Start Date (Optional)</Label>
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
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
              <Label htmlFor="mandateEndDate">Mandate End Date (Optional)</Label>
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
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
            {(isFormSubmitting || isSubmittingProp) ? (user ? 'Saving...' : 'Sending Invitation...') : (user ? 'Save Changes' : 'Send Invitation')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
