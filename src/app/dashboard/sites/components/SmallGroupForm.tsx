// src/app/dashboard/sites/components/SmallGroupForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SmallGroup, User, SmallGroupFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";
import { ROLES } from "@/lib/constants";
import { Users, Save } from "lucide-react";



const smallGroupFormSchema = z.object({
  name: z.string().min(3, "Small group name must be at least 3 characters."),
  leaderId: z.string().optional(),
  logisticsAssistantId: z.string().optional(),
  financeAssistantId: z.string().optional(),
  meetingDay: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
  meetingTime: z.string().optional(), // You might want to add a regex for time format
  meetingLocation: z.string().optional(),
});

const UNASSIGNED_VALUE = "__UNASSIGNED__"; // Represents no selection

interface SmallGroupFormProps {
  smallGroup?: SmallGroup; // For editing
  siteId: string; 
  onSubmitForm: (data: SmallGroupFormData) => Promise<void>;
  isSaving?: boolean;
}

export function SmallGroupForm({ smallGroup, siteId, onSubmitForm, isSaving }: SmallGroupFormProps) {
  const { toast } = useToast();
  const [availablePersonnel, setAvailablePersonnel] = useState<User[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(true);
  const { control, handleSubmit, register, formState: { errors, isSubmitting }, reset } = useForm<SmallGroupFormData>({
    resolver: zodResolver(smallGroupFormSchema),
    defaultValues: smallGroup ? { 
      name: smallGroup.name, 
      leaderId: smallGroup.leaderId || undefined,
      logisticsAssistantId: smallGroup.logisticsAssistantId || undefined,
      financeAssistantId: smallGroup.financeAssistantId || undefined,
      meetingDay: smallGroup.meetingDay,
      meetingTime: smallGroup.meetingTime,
      meetingLocation: smallGroup.meetingLocation,
    } : {
      name: "",
      leaderId: undefined,
      logisticsAssistantId: undefined,
      financeAssistantId: undefined,
      meetingDay: undefined,
      meetingTime: "",
      meetingLocation: "",
    },
  });

  useEffect(() => {
    const fetchPersonnel = async () => {
      setIsLoadingPersonnel(true);
      try {
        const users = await profileService.getEligiblePersonnel(siteId, smallGroup?.id);
        setAvailablePersonnel(users);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast({ title: "Error", description: `Failed to load personnel: ${message}` , variant: 'destructive' });
      } finally {
        setIsLoadingPersonnel(false);
      }
    };

    fetchPersonnel();
  }, [siteId, smallGroup?.id]);

  const processSubmit = async (data: SmallGroupFormData) => {
    await onSubmitForm(data);
    if (!smallGroup) {
      reset(); 
    }
  };

  return (
    <Card className="shadow-xl w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Users className="mr-3 h-7 w-7 text-primary" />
          {smallGroup ? "Edit Small Group" : "Add New Small Group"}
        </CardTitle>
        <CardDescription>
          {smallGroup ? `Update details for ${smallGroup.name}.` : `Fill in the details for the new small group in site ID: ${siteId}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Small Group Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g., Campus Alpha Group" className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="meetingDay">Meeting Day (Optional)</Label>
              <Input id="meetingDay" {...register("meetingDay")} placeholder="e.g., Wednesday" className="mt-1" />
              {errors.meetingDay && <p className="text-sm text-destructive mt-1">{errors.meetingDay.message}</p>}
            </div>
            <div>
              <Label htmlFor="meetingTime">Meeting Time (Optional)</Label>
              <Input id="meetingTime" {...register("meetingTime")} placeholder="e.g., 7:00 PM" className="mt-1" />
              {errors.meetingTime && <p className="text-sm text-destructive mt-1">{errors.meetingTime.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="meetingLocation">Meeting Location (Optional)</Label>
            <Input id="meetingLocation" {...register("meetingLocation")} placeholder="e.g., Room 101, Main Hall" className="mt-1" />
            {errors.meetingLocation && <p className="text-sm text-destructive mt-1">{errors.meetingLocation.message}</p>}
          </div>

          <div>
            <Label htmlFor="leaderId">Small Group Leader (Optional)</Label>
            <Controller
              name="leaderId"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(value) => field.onChange(value === UNASSIGNED_VALUE ? undefined : value)} 
                  value={field.value || UNASSIGNED_VALUE}
                >
                  <SelectTrigger id="leaderId" className="mt-1" disabled={isLoadingPersonnel}>
                    <SelectValue placeholder={isLoadingPersonnel ? "Loading..." : "Select Leader"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>None (Unassigned)</SelectItem>
                    {availablePersonnel.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.leaderId && <p className="text-sm text-destructive mt-1">{errors.leaderId.message}</p>}
          </div>

          <div>
            <Label htmlFor="logisticsAssistantId">Logistics Assistant (Optional)</Label>
            <Controller
              name="logisticsAssistantId"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(value) => field.onChange(value === UNASSIGNED_VALUE ? undefined : value)} 
                  value={field.value || UNASSIGNED_VALUE}
                >
                  <SelectTrigger id="logisticsAssistantId" className="mt-1" disabled={isLoadingPersonnel}>
                    <SelectValue placeholder="Select Logistics Assistant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>None (Unassigned)</SelectItem>
                    {availablePersonnel.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.logisticsAssistantId && <p className="text-sm text-destructive mt-1">{errors.logisticsAssistantId.message}</p>}
          </div>

          <div>
            <Label htmlFor="financeAssistantId">Finance Assistant (Optional)</Label>
            <Controller
              name="financeAssistantId"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(value) => field.onChange(value === UNASSIGNED_VALUE ? undefined : value)} 
                  value={field.value || UNASSIGNED_VALUE}
                >
                  <SelectTrigger id="financeAssistantId" className="mt-1" disabled={isLoadingPersonnel}>
                    <SelectValue placeholder="Select Finance Assistant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>None (Unassigned)</SelectItem>
                    {availablePersonnel.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.financeAssistantId && <p className="text-sm text-destructive mt-1">{errors.financeAssistantId.message}</p>}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
              Leaders and assistants can be chosen from unassigned Small Group Leaders, the Site Coordinator of this site, or National Coordinators. Ensure gender considerations for assistants if applicable.
          </p>

          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting || isSaving}>
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting || isSaving ? "Saving..." : (smallGroup ? "Save Changes" : "Add Small Group")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
