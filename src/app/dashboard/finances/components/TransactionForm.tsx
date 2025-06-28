// src/app/dashboard/finances/components/TransactionForm.tsx
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
import type { TransactionFormData, Site, SmallGroup } from "@/lib/types";
import { mockSites, mockSmallGroups } from "@/lib/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/constants"; // For potential future role-based logic if needed

const entityTypeSchema = z.enum(["national", "site", "small_group", "external_donor", "vendor", "beneficiary", "other"]);

const transactionFormSchema = z.object({
  date: z.date({ required_error: "Transaction date is required." }),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  description: z.string().min(5, "Description must be at least 5 characters."),
  transactionType: z.enum(["transfer", "expense", "income_source"], { required_error: "Transaction type is required." }),
  
  senderEntityType: entityTypeSchema,
  senderEntityId: z.string().min(1, "Sender ID is required."),
  senderEntityName: z.string().optional(),

  recipientEntityType: entityTypeSchema,
  recipientEntityId: z.string().min(1, "Recipient ID is required."),
  recipientEntityName: z.string().optional(),
  
  level: z.enum(["national", "site", "small_group"]), // Should typically be 'national' for NC
  relatedSiteId: z.string().optional(),
  relatedSmallGroupId: z.string().optional(),
}).refine(data => { // Basic validation: national can't send to itself as income or receive from itself as expense in simple cases.
    if(data.transactionType === 'income_source' && data.senderEntityType === 'national' && data.recipientEntityType === 'national') return false;
    if(data.transactionType === 'expense' && data.senderEntityType === 'national' && data.recipientEntityType === 'national') return false;
    return true;
}, { message: "National entity cannot be both sender and recipient for income/expense in this manner." });


interface TransactionFormProps {
  transaction?: TransactionFormData; // For editing (future)
  onSubmitForm: (data: TransactionFormData) => Promise<void>;
}

export function TransactionForm({ transaction, onSubmitForm }: TransactionFormProps) {
  const { toast } = useToast();
  
  // For NC, sender is usually 'national' for expenses/transfers, recipient is 'national' for income
  const defaultValues: Partial<TransactionFormData> = transaction ? transaction : {
    date: new Date(),
    level: "national", // National coordinator primarily records national level transactions
    senderEntityType: "national", // Default for expenses/transfers
    senderEntityId: "aylf_national", // Default for expenses/transfers
    recipientEntityType: undefined, // User needs to select for expenses/transfers
    recipientEntityId: undefined, // User needs to select
  };

  const { control, handleSubmit, register, watch, formState: { errors, isSubmitting }, reset, setValue } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
  });

  const watchedTransactionType = watch("transactionType");
  const watchedSenderEntityType = watch("senderEntityType");
  const watchedRecipientEntityType = watch("recipientEntityType");

  useEffect(() => {
    if (watchedTransactionType === "income_source") {
      setValue("recipientEntityType", "national");
      setValue("recipientEntityId", "aylf_national");
      setValue("senderEntityType", "external_donor"); // Common source
      setValue("senderEntityId", "");
    } else if (watchedTransactionType === "expense" || watchedTransactionType === "transfer") {
      setValue("senderEntityType", "national");
      setValue("senderEntityId", "aylf_national");
      setValue("recipientEntityType", undefined); // User to define
      setValue("recipientEntityId", "");
    }
  }, [watchedTransactionType, setValue]);

  const processSubmit = async (data: TransactionFormData) => {
    // Auto-fill names if ID is selected for site/SG
    if(data.senderEntityType === 'site' && data.senderEntityId && !data.senderEntityName) {
        data.senderEntityName = mockSites.find(s => s.id === data.senderEntityId)?.name;
    }
    if(data.recipientEntityType === 'site' && data.recipientEntityId && !data.recipientEntityName) {
        data.recipientEntityName = mockSites.find(s => s.id === data.recipientEntityId)?.name;
    }
    // Add similar for Small Groups if they become direct senders/recipients in this form's context

    await onSubmitForm(data);
    if (!transaction) { // Reset form only if creating
      reset({
        date: new Date(),
        level: "national",
        senderEntityType: "national",
        senderEntityId: "aylf_national",
      }); 
    }
  };

  const getEntityIdOptions = (type?: typeof entityTypeSchema._type) => {
    if (type === 'site') return mockSites.map(s => ({ value: s.id, label: s.name }));
    if (type === 'small_group') return mockSmallGroups.map(sg => ({ value: sg.id, label: `${sg.name} (${mockSites.find(s=>s.id === sg.siteId)?.name || 'Unknown Site'})` }));
    return [];
  }

  return (
    <Card className="shadow-xl w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <DollarSign className="mr-3 h-7 w-7 text-primary" />
          {transaction ? "Edit Transaction" : "Record New Transaction"}
        </CardTitle>
        <CardDescription>
          {transaction ? `Update details for transaction: ${transaction.description}` : "Fill in the details for the new financial transaction."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="date">Transaction Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal mt-1", !field.value && "text-muted-foreground")}>
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
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} placeholder="0.00" className="mt-1" />
              {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="Detailed description of the transaction..." rows={3} className="mt-1" />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="transactionType">Transaction Type</Label>
            <Controller
              name="transactionType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="transactionType" className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income_source">Income Source</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.transactionType && <p className="text-sm text-destructive mt-1">{errors.transactionType.message}</p>}
          </div>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Sender Details</legend>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="senderEntityType">Sender Entity Type</Label>
                  <Controller name="senderEntityType" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="site">Site</SelectItem>
                        <SelectItem value="small_group">Small Group</SelectItem>
                        <SelectItem value="external_donor">External Donor</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                  {errors.senderEntityType && <p className="text-sm text-destructive mt-1">{errors.senderEntityType.message}</p>}
                </div>
                <div>
                  <Label htmlFor="senderEntityId">Sender ID/Name</Label>
                  {['site', 'small_group'].includes(watchedSenderEntityType || "") ? (
                     <Controller name="senderEntityId" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={`Select Sender ${watchedSenderEntityType}`} /></SelectTrigger>
                            <SelectContent>
                                {getEntityIdOptions(watchedSenderEntityType).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     )} />
                  ) : (
                    <Input id="senderEntityId" {...register("senderEntityId")} placeholder="e.g., donor_xyz or Specific Name" className="mt-1" />
                  )}
                  {errors.senderEntityId && <p className="text-sm text-destructive mt-1">{errors.senderEntityId.message}</p>}
                </div>
              </div>
            </div>
          </fieldset>

           <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Recipient Details</legend>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientEntityType">Recipient Entity Type</Label>
                   <Controller name="recipientEntityType" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="site">Site</SelectItem>
                        <SelectItem value="small_group">Small Group</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="beneficiary">Beneficiary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                  {errors.recipientEntityType && <p className="text-sm text-destructive mt-1">{errors.recipientEntityType.message}</p>}
                </div>
                <div>
                  <Label htmlFor="recipientEntityId">Recipient ID/Name</Label>
                   {['site', 'small_group'].includes(watchedRecipientEntityType || "") ? (
                     <Controller name="recipientEntityId" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={`Select Recipient ${watchedRecipientEntityType}`} /></SelectTrigger>
                            <SelectContent>
                                {getEntityIdOptions(watchedRecipientEntityType).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     )} />
                  ) : (
                    <Input id="recipientEntityId" {...register("recipientEntityId")} placeholder="e.g., venue_conf_center or Specific Name" className="mt-1" />
                  )}
                  {errors.recipientEntityId && <p className="text-sm text-destructive mt-1">{errors.recipientEntityId.message}</p>}
                </div>
              </div>
            </div>
          </fieldset>
          
          {/* Hidden level for NC, default to national */}
          <input type="hidden" {...register("level")} value="national" />


          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? "Saving..." : (transaction ? "Save Changes" : "Record Transaction")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
