// src/app/dashboard/settings/profile/components/ProfileForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { User, Site, SmallGroup } from "@/lib/types";
import { siteService } from "@/services/siteService";
import smallGroupService from "@/services/smallGroupService";
import { ROLES } from "@/lib/constants";

import { Save, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const profileFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  mandateStartDate: z.date().optional().nullable(),
  mandateEndDate: z.date().optional().nullable(),
}).refine(data => !data.mandateEndDate || !data.mandateStartDate || (data.mandateEndDate >= data.mandateStartDate), {
    message: "Mandate end date cannot be before start date.",
    path: ["mandateEndDate"],
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  currentUser: User;
  onUpdateProfile: (updatedData: Partial<User>) => void;
  canEdit: boolean;
}

export function ProfileForm({ currentUser, onUpdateProfile, canEdit }: ProfileFormProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true);
    const { toast } = useToast();

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!currentUser.siteId && !currentUser.smallGroupId) {
        setIsLoadingAssignment(false);
        return;
      }

      setIsLoadingAssignment(true);
      try {
        const sitesRes = await siteService.getAllSites();
        if (sitesRes.data) setSites(sitesRes.data);

        if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
          const smallGroupsResponse = await smallGroupService.getFilteredSmallGroups({ user: currentUser });
          if (smallGroupsResponse.data) setSmallGroups(smallGroupsResponse.data);
        }
      } catch (error) {
        console.error("Failed to fetch assignments", error);
        toast({ title: "Error", description: "Could not load assignment data.", variant: "destructive" });
      } finally {
        setIsLoadingAssignment(false);
      }
    };

    fetchAssignments();
  }, [currentUser.role, currentUser.siteId, currentUser.smallGroupId, toast]);

  const { control, register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser.name || "",
      email: currentUser.email || "",
      mandateStartDate: currentUser.mandateStartDate ? parseISO(currentUser.mandateStartDate) : undefined,
      mandateEndDate: currentUser.mandateEndDate ? parseISO(currentUser.mandateEndDate) : undefined,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const profileUpdateData: Partial<User> = {
        name: data.name,
        email: data.email,
        mandateStartDate: data.mandateStartDate ? data.mandateStartDate.toISOString() : undefined,
        mandateEndDate: data.mandateEndDate ? data.mandateEndDate.toISOString() : undefined,
      };
      onUpdateProfile(profileUpdateData);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleDisplayName = (role: User["role"]) => {
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };
  
  const getAssignmentName = () => {
    if (isLoadingAssignment) return "Loading assignment...";

    if (currentUser.role === ROLES.SITE_COORDINATOR && currentUser.siteId) {
      return sites.find(s => s.id === currentUser.siteId)?.name || "Unknown Site";
    }
    if (currentUser.role === ROLES.SMALL_GROUP_LEADER && currentUser.smallGroupId) {
      const sg = smallGroups.find(sg => sg.id === currentUser.smallGroupId);
      if (sg) {
        const site = sites.find(s => s.id === sg.siteId);
        return `${sg.name} (Site: ${site?.name || 'Unknown'})`;
      }
      return "Unknown Small Group";
    }
    return "N/A";
  };

  const isMandateDateEditingAllowed = canEdit && currentUser.role === ROLES.NATIONAL_COORDINATOR;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          {canEdit ? "Update your profile information." : "View your profile details."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              {...register("name")} 
              disabled={!canEdit || isSubmitting} 
              className="mt-1"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              {...register("email")} 
              disabled={!canEdit || isSubmitting} 
              className="mt-1"
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Input 
              id="role" 
              value={getRoleDisplayName(currentUser.role)} 
              disabled 
              className="mt-1 bg-muted/50"
            />
          </div>

          {(currentUser.role === ROLES.SITE_COORDINATOR || currentUser.role === ROLES.SMALL_GROUP_LEADER) && (
            <div>
              <Label htmlFor="assignment">Assignment</Label>
              <Input 
                id="assignment" 
                value={getAssignmentName()} 
                disabled 
                className="mt-1 bg-muted/50"
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="mandateStartDate">Mandate Start Date</Label>
            <Controller
              name="mandateStartDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}
                      disabled={!isMandateDateEditingAllowed || isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : 
                        (isMandateDateEditingAllowed ? <span>Pick a date</span> : <span>N/A</span>)
                      }
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
            <Label htmlFor="mandateEndDate">Mandate End Date</Label>
             <Controller
              name="mandateEndDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}
                      disabled={!isMandateDateEditingAllowed || isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : 
                        (isMandateDateEditingAllowed ? <span>Pick a date (Optional)</span> : <span>N/A</span>)
                      }
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

          {canEdit && (
            <Button type="submit" disabled={isSubmitting || !isDirty} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
