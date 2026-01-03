"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { FundAllocationFormData } from "@/lib/types";

const allocationFormSchema = z.object({
  recipientId: z.string().min(1, { message: "Vous devez sélectionner un bénéficiaire." }),
  recipientType: z.enum(['site', 'smallGroup']),
  amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  allocationDate: z.date({ required_error: "La date d'allocation est requise." }),
  description: z.string().min(5, { message: "La description doit contenir au moins 5 caractères." }).max(200).optional(),
});

interface AllocationFormProps {
  readonly recipients: Array<{ id: string; name: string; }>;
  readonly recipientType: 'site' | 'smallGroup';
  readonly recipientLabel: string;
  readonly onSubmit: (data: z.infer<typeof allocationFormSchema>) => Promise<void>;
  readonly isLoading: boolean;
}

export function AllocationForm({ recipients, recipientType, recipientLabel, onSubmit, isLoading }: Readonly<AllocationFormProps>) {
  const form = useForm<z.infer<typeof allocationFormSchema>>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      recipientId: '',
      recipientType: recipientType, // Set recipientType from props
      amount: 0,
      allocationDate: new Date(),
      description: '',
    },
  });

  // Sync form state when recipientType prop changes (e.g. NC toggling Direct mode)
  React.useEffect(() => {
    form.setValue('recipientType', recipientType);
    form.setValue('recipientId', ''); // Reset selection to avoid incompatible IDs
  }, [recipientType, form]);

  const handleFormSubmit = (values: z.infer<typeof allocationFormSchema>) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="recipientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{recipientLabel}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`Sélectionner un ${recipientLabel.toLowerCase().replaceAll('bénéficiaire', '').trim()}...`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {recipients.map(recipient => (
                    <SelectItem key={recipient.id} value={recipient.id}>{recipient.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (USD)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="50000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allocationDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date d'allocation</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Choisir une date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Allocation pour le budget du 3ème trimestre (Q3) du site de Goma."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Enregistrement...' : 'Enregistrer l\'Allocation'}
        </Button>
      </form>
    </Form>
  );
}
