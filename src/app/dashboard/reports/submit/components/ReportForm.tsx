// src/app/dashboard/reports/submit/components/ReportForm.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Report, ReportFormData, ActivityType, Site, SmallGroup, Activity } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Send, CalendarIcon, X } from "lucide-react";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getActivityTypes } from '@/services/activityTypeService';
import siteService from '@/services/siteService';
import reportService from '@/services/reportService';
import smallGroupService from '@/services/smallGroupService';
import activityService from '@/services/activityService'; // Import activity service
import storage from '@/services/storageService';
import { useCurrentUser } from "../../../../../hooks/use-current-user";
import { ROLES } from "@/lib/constants";

const CURRENCIES = ["USD", "CDF"];

const reportFormSchema = z.object({
  activityId: z.string().min(1, "A planned activity must be selected."), // New field
  title: z.string().min(5, "Title must be at least 5 characters long."),
  activityDate: z.date(),
  level: z.enum(["national", "site", "small_group"]),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
  activityTypeId: z.string().min(1, "Activity type is required."),
  thematic: z.string().min(1, "Thematic is required."),
  speaker: z.string().optional(),
  moderator: z.string().optional(),
  girlsCount: z.number().int().min(0).optional(),
  boysCount: z.number().int().min(0).optional(),
  participantsCountReported: z.number().int().min(0).optional(),
  totalExpenses: z.number().min(0).optional(),
  currency: z.string().optional(),
  content: z.string().min(20, "Content must be at least 20 characters long."),
  images: z.instanceof(FileList).optional(),
  financialSummary: z.string().optional(),
}).refine(data => {
  if (data.level === 'site' || data.level === 'small_group') {
    return !!data.siteId;
  }
  return true;
}, {
  message: "Site is required for site or small group level reports.",
  path: ["siteId"],
}).refine(data => {
  if (data.level === 'small_group') {
    return !!data.smallGroupId;
  }
  return true;
}, {
  message: "Small group is required for small group level reports.",
  path: ["smallGroupId"],
});

type ReportFormSchema = z.infer<typeof reportFormSchema>;

interface ReportFormProps {
  onSubmitSuccess?: (data: Report) => void;
}

export function ReportForm({ onSubmitSuccess }: ReportFormProps) {
  const { toast } = useToast();
  const currentUser = useCurrentUser();
  const [plannedActivities, setPlannedActivities] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const { control, handleSubmit, register, watch, formState: { errors }, reset, setValue } = useForm<ReportFormSchema>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      activityId: "",
      title: "",
      activityTypeId: "",
      thematic: "",
      content: "",
      currency: "USD",
      girlsCount: 0,
      boysCount: 0,
      participantsCountReported: 0,
      totalExpenses: 0,
      financialSummary: "",
    },
  });

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const [activities, types] = await Promise.all([
        activityService.getPlannedActivitiesForUser(currentUser),
        getActivityTypes()
      ]);
      setPlannedActivities(activities);
      setActivityTypes(types);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({
        title: "Error",
        description: "Could not load necessary data. Please try again later.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, toast]);

  const handleActivitySelection = useCallback((activityId: string) => {
    const activity = plannedActivities.find(a => a.id === activityId);
    if (activity) {
      setSelectedActivity(activity);
      setValue("activityId", activity.id);
      setValue("title", activity.title);
      setValue("activityDate", new Date(activity.date));
      setValue("level", activity.level);
      setValue("siteId", activity.site_id || undefined);
      setValue("smallGroupId", activity.small_group_id || undefined);
      setValue("activityTypeId", activity.activity_type_id);
      setValue("thematic", activity.thematic);
      // Reset fields that are report-specific
      setValue("content", "");
      setValue("girlsCount", 0);
      setValue("boysCount", 0);
      setValue("participantsCountReported", activity.participants_count_planned || 0);
      setValue("totalExpenses", 0);
      setValue("financialSummary", "");
      setSelectedFiles([]);
    } else {
        setSelectedActivity(null);
        reset(); // Or reset to default values if an activity is deselected
    }
  }, [plannedActivities, setValue, reset]);

  const level = watch("level");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const processSubmit = async (data: ReportFormSchema) => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to submit a report.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      let imageUrls: Array<{ name: string; url: string }> = [];
      if (selectedFiles.length > 0) {
        // Use the consistent 'report-images' bucket
        const uploadPromises = selectedFiles.map(file => storageService.uploadFile(file, 'report-images'));
        const uploadedFiles = await Promise.all(uploadPromises);
        imageUrls = uploadedFiles.map(uploadedFile => ({ 
          name: uploadedFile.filePath, 
          url: uploadedFile.publicUrl 
        }));
      }

      // The Zod schema `ReportFormSchema` is the source of truth for the form's data shape.
      // The `ReportFormData` type in `types.ts` is what the service expects.
      // We ensure they are aligned.
      const reportPayload: ReportFormData = {
        ...data,
        activityDate: format(data.activityDate, 'yyyy-MM-dd'),
        submittedBy: currentUser.id,
        images: imageUrls,
        status: 'submitted',
        // No longer need manual mapping, Zod schema provides `activityId`
      };

      const newReport = await reportService.createReport(reportPayload);

      toast({ title: "Success!", description: "Report submitted successfully." });
      reset();
      setSelectedFiles([]);
      setSelectedActivity(null);
      if (onSubmitSuccess) {
        onSubmitSuccess(newReport);
      }

    } catch (error) { 
      console.error("Submission Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Submission Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Submit Activity Report</CardTitle>
        <CardDescription>Select a planned activity to pre-fill the form, then complete and submit your report.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-8">
          
          {/* Activity Selector */}
          <div>
            <Label htmlFor="activityId">Select a Planned Activity</Label>
            <Controller
              name="activityId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={(value) => { field.onChange(value); handleActivitySelection(value); }} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an activity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plannedActivities.length > 0 ? (
                      plannedActivities.map(activity => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.title} ({format(new Date(activity.date), "PPP")})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No planned activities found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.activityId && <p className="text-sm text-destructive mt-1">{errors.activityId.message}</p>}
          </div>

          {selectedActivity && (
            <div className="space-y-6 p-4 border rounded-lg bg-muted/20 animate-in fade-in-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Report Title</Label>
                  <Input id="title" {...register("title")} placeholder="e.g., Weekly Mentorship Session" disabled />
                  {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <Label htmlFor="activityDate">Activity Date</Label>
                  <Controller
                    control={control}
                    name="activityDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.activityDate && <p className="text-sm text-destructive mt-1">{errors.activityDate.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="thematic">Thematic</Label>
                  <Input id="thematic" {...register("thematic")} placeholder="e.g., Leadership" disabled />
                  {errors.thematic && <p className="text-sm text-destructive mt-1">{errors.thematic.message}</p>}
                </div>
                <div>
                  <Label htmlFor="activityTypeId">Activity Type</Label>
                  <Controller
                    name="activityTypeId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                          {activityTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.activityTypeId && <p className="text-sm text-destructive mt-1">{errors.activityTypeId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="speaker">Speaker (Optional)</Label>
                  <Input id="speaker" {...register("speaker")} placeholder="e.g., John Doe" />
                </div>
                <div>
                  <Label htmlFor="moderator">Moderator (Optional)</Label>
                  <Input id="moderator" {...register("moderator")} placeholder="e.g., Jane Smith" />
                </div>
              </div>

              <div>
                <Label>Attendance</Label>
                <div className="grid grid-cols-2 gap-6 p-4 border rounded-md">
                  <div>
                    <Label htmlFor="girlsCount">Girls</Label>
                    <Input id="girlsCount" type="number" {...register("girlsCount", { valueAsNumber: true })} placeholder="0" />
                    {errors.girlsCount && <p className="text-sm text-destructive mt-1">{errors.girlsCount.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="boysCount">Boys</Label>
                    <Input id="boysCount" type="number" {...register("boysCount", { valueAsNumber: true })} placeholder="0" />
                    {errors.boysCount && <p className="text-sm text-destructive mt-1">{errors.boysCount.message}</p>}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="content">Description / Content</Label>
                <Textarea id="content" {...register("content")} placeholder="Detailed description of the activity..." rows={6} />
                {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="financialSummary">Financial Summary (Optional)</Label>
                <Textarea id="financialSummary" {...register("financialSummary")} placeholder="Brief summary of finances..." rows={3} />
                {errors.financialSummary && <p className="text-sm text-destructive mt-1">{errors.financialSummary.message}</p>}
              </div>

              <div>
                <Label>Images (Optional)</Label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                    <Label htmlFor="file-upload" className="relative cursor-pointer bg-background rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring">
                      <span>Upload files</span>
                      <Input id="file-upload" {...register("images")} type="file" className="sr-only" multiple onChange={handleFileChange} />
                    </Label>
                    <p className="pl-1">or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative aspect-square group">
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`preview ${file.name}`}
                          fill
                          className="object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-1 rounded-b-md">
                          <p className="text-white text-xs text-center truncate">{file.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.images && <p className="text-sm text-destructive mt-1">{typeof errors.images.message === 'string' ? errors.images.message : "Error with image upload"}</p>}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting || !selectedActivity}>
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" /> Submit Report
              </> 
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
