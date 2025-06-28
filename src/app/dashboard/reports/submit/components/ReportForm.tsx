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
import type { Report } from "@/lib/types";
import { UploadCloud, FileText, Send, CalendarIcon } from "lucide-react";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { mockSites, mockSmallGroups } from "@/lib/mockData"; // For dropdowns

const ACTIVITY_TYPES = [
  "Small Group Meeting", "Workshop", "Conference", "Community Service", 
  "Seminar", "Training", "Fellowship", "Outreach", "Sports Event", "Other"
];
const CURRENCIES = ["USD", "CDF"];

const reportFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  activityDate: z.date({ required_error: "Activity date is required." }),
  level: z.enum(["national", "site", "small_group"], { required_error: "Please select a level" }),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
  activityType: z.string().min(1, "Activity type is required"),
  thematic: z.string().min(5, "Thematic must be at least 5 characters"),
  speaker: z.string().optional(),
  moderator: z.string().optional(),
  girlsCount: z.coerce.number().int().min(0).optional(),
  boysCount: z.coerce.number().int().min(0).optional(),
  amountUsed: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  content: z.string().min(20, "Report content must be at least 20 characters"),
  financialSummary: z.string().optional(),
  images: z.custom<FileList>().optional(),
}).refine(data => { // Ensure siteId is present if level is site or small_group
  if ((data.level === "site" || data.level === "small_group") && !data.siteId) {
    return false;
  }
  return true;
}, {
  message: "Site selection is required for Site or Small Group level reports.",
  path: ["siteId"],
}).refine(data => { // Ensure smallGroupId is present if level is small_group
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSmallGroups, setAvailableSmallGroups] = useState(mockSmallGroups);

  const { control, handleSubmit, register, watch, formState: { errors }, reset, setValue } = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      title: "",
      level: undefined,
      activityType: "",
      thematic: "",
      content: "",
      currency: "USD",
      girlsCount: 0,
      boysCount: 0,
      amountUsed: 0,
    }
  });

  const watchedLevel = watch("level");
  const watchedSiteId = watch("siteId");

  useEffect(() => {
    if (watchedLevel === "small_group" && watchedSiteId) {
      setAvailableSmallGroups(mockSmallGroups.filter(sg => sg.siteId === watchedSiteId));
    } else {
      setAvailableSmallGroups([]); // Or all SGs if no site filter, adjust as needed
    }
    if (watchedLevel !== "small_group") {
        setValue("smallGroupId", undefined); // Clear small group if level changes
    }
  }, [watchedLevel, watchedSiteId, setValue]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const processSubmit = async (data: ReportFormData) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const participantsCountReported = (data.girlsCount || 0) + (data.boysCount || 0);

    const submittedReport: Report = {
      id: `rep_${Date.now()}`,
      submittedBy: "current_user_id_mock", // Replace with actual user ID
      submissionDate: new Date().toISOString(),
      activityDate: data.activityDate.toISOString(),
      ...data,
      participantsCountReported,
      images: selectedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
    };
    
    console.log("Report Submitted:", submittedReport);
    toast({
      title: "Report Submitted Successfully!",
      description: `Your report "${data.title}" has been recorded.`,
      variant: "default",
    });
    reset();
    setSelectedFiles([]);
    if (onSubmitSuccess) onSubmitSuccess(submittedReport);
    setIsSubmitting(false);
  };

  return (
    <Card className="shadow-xl w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <FileText className="mr-3 h-7 w-7 text-primary" />
          Submit New Report
        </CardTitle>
        <CardDescription>Fill in the details below to submit your activity report.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title">Report Title</Label>
              <Input id="title" {...register("title")} placeholder="e.g., Q3 Youth Workshop Summary" className="mt-1" />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            </div>
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
                          "w-full justify-start text-left font-normal mt-1",
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="level">Report Level</Label>
              <Controller
                name="level"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="level" className="mt-1">
                      <SelectValue placeholder="Select report level" />
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
              <Label htmlFor="activityType">Type of Activity</Label>
              <Controller
                  name="activityType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="activityType" className="mt-1">
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              {errors.activityType && <p className="text-sm text-destructive mt-1">{errors.activityType.message}</p>}
            </div>
          </div>
          
          {(watchedLevel === "site" || watchedLevel === "small_group") && (
            <div>
              <Label htmlFor="siteId">Site</Label>
               <Controller
                  name="siteId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="siteId" className="mt-1">
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockSites.map(site => (
                          <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              {errors.siteId && <p className="text-sm text-destructive mt-1">{errors.siteId.message}</p>}
            </div>
          )}

          {watchedLevel === "small_group" && watchedSiteId && (
            <div>
              <Label htmlFor="smallGroupId">Small Group</Label>
              <Controller
                name="smallGroupId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableSmallGroups.length === 0}>
                    <SelectTrigger id="smallGroupId" className="mt-1">
                      <SelectValue placeholder="Select small group" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSmallGroups.map(sg => (
                        <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.smallGroupId && <p className="text-sm text-destructive mt-1">{errors.smallGroupId.message}</p>}
            </div>
          )}


          <div>
            <Label htmlFor="thematic">Thematic / Topic</Label>
            <Input id="thematic" {...register("thematic")} placeholder="e.g., Leadership in Action" className="mt-1" />
            {errors.thematic && <p className="text-sm text-destructive mt-1">{errors.thematic.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="speaker">Speaker / Intervenant (Optional)</Label>
              <Input id="speaker" {...register("speaker")} placeholder="Name of the speaker" className="mt-1" />
              {errors.speaker && <p className="text-sm text-destructive mt-1">{errors.speaker.message}</p>}
            </div>
            <div>
              <Label htmlFor="moderator">Moderator (Optional)</Label>
              <Input id="moderator" {...register("moderator")} placeholder="Name of the moderator" className="mt-1" />
              {errors.moderator && <p className="text-sm text-destructive mt-1">{errors.moderator.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="girlsCount">Number of Girls (Optional)</Label>
              <Input id="girlsCount" type="number" {...register("girlsCount")} placeholder="0" className="mt-1" />
              {errors.girlsCount && <p className="text-sm text-destructive mt-1">{errors.girlsCount.message}</p>}
            </div>
            <div>
              <Label htmlFor="boysCount">Number of Boys (Optional)</Label>
              <Input id="boysCount" type="number" {...register("boysCount")} placeholder="0" className="mt-1" />
              {errors.boysCount && <p className="text-sm text-destructive mt-1">{errors.boysCount.message}</p>}
            </div>
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="amountUsed">Amount Used (Optional)</Label>
              <Input id="amountUsed" type="number" step="0.01" {...register("amountUsed")} placeholder="0.00" className="mt-1" />
              {errors.amountUsed && <p className="text-sm text-destructive mt-1">{errors.amountUsed.message}</p>}
            </div>
            <div>
              <Label htmlFor="currency">Currency (Optional)</Label>
               <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="currency" className="mt-1">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(curr => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
            </div>
          </div>


          <div>
            <Label htmlFor="content">Report Narrative / Details</Label>
            <Textarea id="content" {...register("content")} placeholder="Describe the activity, outcomes, challenges, etc." rows={6} className="mt-1" />
            {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="financialSummary">Additional Financial Notes (Optional)</Label>
            <Textarea id="financialSummary" {...register("financialSummary")} placeholder="Brief overview of income, expenses, or donations if not covered by 'Amount Used'." rows={3} className="mt-1" />
            {errors.financialSummary && <p className="text-sm text-destructive mt-1">{errors.financialSummary.message}</p>}
          </div>

          <div>
            <Label htmlFor="images">Upload Images (Optional)</Label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md hover:border-primary transition-colors">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="flex text-sm text-muted-foreground">
                  <label
                    htmlFor="images"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring"
                  >
                    <span>Upload files</span>
                    <Input id="images" type="file" {...register("images")} onChange={handleFileChange} className="sr-only" multiple accept="image/*" />
                  </label>
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
