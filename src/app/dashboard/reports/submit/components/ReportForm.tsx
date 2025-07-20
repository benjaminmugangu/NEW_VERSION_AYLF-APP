// src/app/dashboard/reports/submit/components/ReportForm.tsx
"use client";

import React, { useState, useEffect } from "react";
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
import type { Report, ActivityType, Site, SmallGroup } from "@/lib/types";
import { UploadCloud, Send, CalendarIcon } from "lucide-react";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getAllActivityTypes } from "@/services/activityTypeService";
import siteService from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import { useCurrentUser } from "../../../../../hooks/use-current-user";
import { ROLES } from "@/lib/constants";

const CURRENCIES = ["USD", "CDF"];

const reportFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  activityDate: z.date({ required_error: "Activity date is required." }),
  level: z.enum(["national", "site", "small_group"], { required_error: "Please select a level" }),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
  activityTypeId: z.string({ required_error: "Activity type is required" }).min(1, "Activity type is required"),
  thematic: z.string().min(5, "Thematic must be at least 5 characters"),
  speaker: z.string().optional(),
  moderator: z.string().optional(),
  girlsCount: z.coerce.number().int().min(0).optional(),
  boysCount: z.coerce.number().int().min(0).optional(),
  expenses: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  content: z.string().min(20, "Report content must be at least 20 characters"),
  financialSummary: z.string().optional(),
  images: z.custom<FileList>().optional(),
}).refine(data => {
  if ((data.level === "site" || data.level === "small_group") && !data.siteId) {
    return false;
  }
  return true;
}, {
  message: "Site selection is required for Site or Small Group level reports.",
  path: ["siteId"],
}).refine(data => {
  if (data.level === "small_group" && !data.smallGroupId) {
    return false;
  }
  return true;
}, {
  message: "Small Group selection is required for Small Group level reports.",
  path: ["smallGroupId"],
});

type ReportFormData = z.infer<typeof reportFormSchema>;

interface ReportFormProps {
  onSubmitSuccess?: (data: Report) => void;
}

export function ReportForm({ onSubmitSuccess }: ReportFormProps) {
  const { toast } = useToast();
  const currentUser = useCurrentUser();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [availableSmallGroups, setAvailableSmallGroups] = useState<SmallGroup[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, register, watch, formState: { errors }, reset, setValue } = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      title: "",
      level: undefined,
      activityTypeId: "",
      thematic: "",
      content: "",
      currency: "USD",
      girlsCount: 0,
      boysCount: 0,
      expenses: 0,
    }
  });

  const watchedLevel = watch("level");
  const watchedSiteId = watch("siteId");

  useEffect(() => {
    async function fetchActivityTypes() {
      const response = await getAllActivityTypes();
      if (response.success && response.data) {
        setActivityTypes(response.data);
      }
    }
    fetchActivityTypes();
  }, []);

  useEffect(() => {
    const fetchSites = async () => {
      if (!currentUser) return;
      const response = await siteService.getFilteredSites({ user: currentUser });
      if (response.success && response.data) {
        setAvailableSites(response.data);
        // If user is not a national coordinator, their site is pre-selected.
        if (currentUser && currentUser.role !== ROLES.NATIONAL_COORDINATOR && response.data.length === 1) {
          setValue('siteId', response.data[0].id);
        }
      } else {
        setAvailableSites([]);
      }
    };
    fetchSites();
  }, [currentUser, setValue]);

  useEffect(() => {
    const fetchSmallGroups = async () => {
      if (!watchedSiteId) {
        setAvailableSmallGroups([]);
        return;
      }

      const response = await smallGroupService.getSmallGroupsBySite(watchedSiteId);

      if (response.success && response.data) {
                if (currentUser && currentUser.role === ROLES.SMALL_GROUP_LEADER && currentUser.smallGroupId) {
          const userSmallGroup = response.data.filter(sg => sg.id === currentUser.smallGroupId);
          setAvailableSmallGroups(userSmallGroup);
          if (userSmallGroup.length === 1) {
            setValue('smallGroupId', userSmallGroup[0].id);
          }
        } else {
          setAvailableSmallGroups(response.data);
        }
      } else {
        setAvailableSmallGroups([]);
      }
    };

    fetchSmallGroups();
  }, [watchedSiteId, currentUser, setValue]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const processSubmit = async (data: ReportFormData) => {
    setIsSubmitting(true);
    toast({ title: "Submitting Report...", description: "Please wait." });

    // This is a placeholder for the actual service call
    // You would replace this with your reportService.createReport(data, files);
    console.log("Form Data:", data);
    console.log("Selected Files:", selectedFiles);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // In a real app, you'd get the created report back from the service
      const createdReport: Report = {
        id: new Date().toISOString(),
        ...data,
        activityDate: data.activityDate.toISOString(),
        submittedBy: currentUser?.id || '',
        submissionDate: new Date().toISOString(),
        status: 'pending',
        images: selectedFiles.map(f => ({ name: f.name, url: URL.createObjectURL(f) })), // placeholder for uploaded URLs
        participantsCountReported: (data.girlsCount || 0) + (data.boysCount || 0),
        totalExpenses: data.expenses,
      };

      toast({ 
        title: "Report Submitted Successfully!",
        description: `Your report titled "${data.title}" has been saved.`,
      });
      reset();
      setSelectedFiles([]);
      if (onSubmitSuccess) {
        onSubmitSuccess(createdReport);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ 
        title: "Submission Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>New Report Details</CardTitle>
        <CardDescription>Fill out the form below to document an activity.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-8">
          
          {/* Report Title */}
          <div>
            <Label htmlFor="title">Report Title</Label>
            <Input id="title" {...register("title")} placeholder="e.g., Weekly Fellowship Summary" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Activity Date */}
            <div>
              <Label htmlFor="activityDate">Activity Date</Label>
              <Controller
                name="activityDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.activityDate && <p className="text-sm text-destructive mt-1">{errors.activityDate.message}</p>}
            </div>

            {/* Activity Type */}
            <div>
              <Label htmlFor="activityTypeId">Activity Type</Label>
              <Controller
                name="activityTypeId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an activity type" />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.activityTypeId && <p className="text-sm text-destructive mt-1">{errors.activityTypeId.message}</p>}
            </div>
          </div>

          {/* Report Level */}
          <div>
            <Label htmlFor="level">Report Level</Label>
            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue("siteId", undefined);
                    setValue("smallGroupId", undefined);
                  }}
                  defaultValue={field.value}
                  disabled={currentUser?.role === ROLES.SMALL_GROUP_LEADER}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select the level of this report" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUser && currentUser.role === ROLES.NATIONAL_COORDINATOR && <SelectItem value="national">National</SelectItem>}
                    {currentUser && [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR].includes(currentUser.role) && <SelectItem value="site">Site</SelectItem>}
                    <SelectItem value="small_group">Small Group</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.level && <p className="text-sm text-destructive mt-1">{errors.level.message}</p>}
          </div>

          {/* Site and Small Group Selectors - Conditional */}
          {(watchedLevel === "site" || watchedLevel === "small_group") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="siteId">Site</Label>
                <Controller
                  name="siteId"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setValue("smallGroupId", undefined);
                      }} 
                      defaultValue={field.value}
                      disabled={!currentUser || currentUser.role !== ROLES.NATIONAL_COORDINATOR}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a site" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.siteId && <p className="text-sm text-destructive mt-1">{errors.siteId.message}</p>}
              </div>

              {watchedLevel === "small_group" && (
                <div>
                  <Label htmlFor="smallGroupId">Small Group</Label>
                  <Controller
                    name="smallGroupId"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={currentUser?.role === ROLES.SMALL_GROUP_LEADER}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a small group" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSmallGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.smallGroupId && <p className="text-sm text-destructive mt-1">{errors.smallGroupId.message}</p>}
                </div>
              )}
            </div>
          )}

          {/* Thematic */}
          <div>
            <Label htmlFor="thematic">Thematic/Topic</Label>
            <Input id="thematic" {...register("thematic")} placeholder="e.g., Servant Leadership" />
            {errors.thematic && <p className="text-sm text-destructive mt-1">{errors.thematic.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Speaker */}
            <div>
              <Label htmlFor="speaker">Speaker (Optional)</Label>
              <Input id="speaker" {...register("speaker")} placeholder="e.g., Dr. John Doe" />
            </div>
            {/* Moderator */}
            <div>
              <Label htmlFor="moderator">Moderator (Optional)</Label>
              <Input id="moderator" {...register("moderator")} placeholder="e.g., Jane Smith" />
            </div>
          </div>

          {/* Attendance */}
          <div>
            <Label>Attendance</Label>
            <div className="grid grid-cols-2 gap-6 p-4 border rounded-md">
              <div>
                <Label htmlFor="girlsCount">Girls</Label>
                <Input id="girlsCount" type="number" {...register("girlsCount")} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="boysCount">Boys</Label>
                <Input id="boysCount" type="number" {...register("boysCount")} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div>
            <Label htmlFor="content">Report Content</Label>
            <Textarea id="content" {...register("content")} placeholder="Provide a detailed summary of the activity..." rows={8} />
            {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
          </div>

          {/* Financial Summary */}
          <div className="space-y-4 p-4 border rounded-md">
            <Label className="text-base font-semibold">Financial Summary (Optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="expenses">Total Expenses</Label>
                <Input id="expenses" type="number" {...register("expenses")} placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="financialSummary">Brief Financial Narrative</Label>
              <Textarea id="financialSummary" {...register("financialSummary")} placeholder="Provide a brief summary of expenses..." rows={3} />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>Attach Images (Optional)</Label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="flex text-sm text-muted-foreground">
                  <Label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring">
                    <span>Upload files</span>
                    <Input id="file-upload" {...register("images")} type="file" className="sr-only" multiple onChange={handleFileChange} />
                  </Label>
                  <p className="pl-1">or drag and drop</p>
                </div>
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
                      layout="fill"
                      objectFit="cover"
                      className="rounded-md"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                        <p className="text-white text-xs text-center p-1 break-all">{file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
             {errors.images && <p className="text-sm text-destructive mt-1">{typeof errors.images.message === 'string' ? errors.images.message : "Error with image upload"}</p>}
          </div>

          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
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
