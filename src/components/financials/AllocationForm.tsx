// src/components/financials/AllocationForm.tsx (v2)
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { FundAllocationFormData, Site, SmallGroup } from '@/lib/types';
import { useSites } from '@/hooks/useSites';
import { useSmallGroups } from '@/hooks/useSmallGroups';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  allocationDate: z.date(),
  goal: z.string().min(1, 'Goal/Purpose is required'),
  source: z.string().min(1, 'Source of funds is required'),
  destinationType: z.enum(['site', 'small_group']).optional(),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
}).refine(data => {
  if (data.destinationType === 'site') return !!data.siteId;
  if (data.destinationType === 'small_group') return !!data.smallGroupId;
  return true; // No destination required if type is not selected
}, {
  message: 'Please select a destination',
  path: ['destinationType'],
});

interface AllocationFormProps {
  onSave: (data: FundAllocationFormData) => void;
  initialData?: Partial<FundAllocationFormData>;
  isSaving?: boolean;
  sites?: { id: string; name: string }[];
  smallGroups?: { id: string; name: string }[];
}

export const AllocationForm: React.FC<AllocationFormProps> = ({ onSave, initialData, isSaving = false, sites = [], smallGroups = [] }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const { currentUser } = useAuth();


    const getInitialDestinationType = React.useCallback(() => {
    if (!isClient) return undefined; // Prevent server-side execution
    if (initialData?.siteId) return 'site';
    if (initialData?.smallGroupId) return 'small_group';
    if (currentUser?.role === ROLES.SITE_COORDINATOR) return 'small_group';
    return undefined;
  }, [initialData, currentUser?.role]);

  const [destinationType, setDestinationType] = useState<string | undefined>(getInitialDestinationType);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialData?.amount || undefined,
      allocationDate: initialData?.allocationDate ? new Date(initialData.allocationDate) : new Date(),
      goal: initialData?.goal || '',
      source: initialData?.source || '',
      destinationType: getInitialDestinationType(),
      siteId: initialData?.siteId || undefined,
      smallGroupId: initialData?.smallGroupId || undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const { destinationType, ...rest } = values;

    const formData: Partial<FundAllocationFormData> = {
      ...rest,
      allocationDate: values.allocationDate.toISOString(),
      siteId: destinationType === 'site' ? values.siteId : undefined,
      smallGroupId: destinationType === 'small_group' ? values.smallGroupId : undefined,
    };

    onSave(formData as FundAllocationFormData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} />
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
                <FormLabel>Allocation Date</FormLabel>
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
                          <span>Pick a date</span>
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source of Funds</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., National Treasury, Special Donation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal / Purpose</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Annual Retreat, Equipment Purchase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {currentUser?.role === ROLES.NATIONAL_COORDINATOR && (
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="destinationType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Allocate to:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          setDestinationType(value);
                          form.setValue('siteId', undefined);
                          form.setValue('smallGroupId', undefined);
                        }}
                        value={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="site" />
                          </FormControl>
                          <FormLabel className="font-normal">Site</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="small_group" />
                          </FormControl>
                          <FormLabel className="font-normal">Small Group</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

                    {isClient && destinationType === 'site' && currentUser?.role === ROLES.NATIONAL_COORDINATOR && (
             <FormField
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Site</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={isLoadingSites}>
                          <SelectValue placeholder="Select a site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((site: Site) => (
                          <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
          )}

                    {isClient && (destinationType === 'small_group' || currentUser?.role === ROLES.SITE_COORDINATOR) && (
             <FormField
                control={form.control}
                name="smallGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Small Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={isLoadingSmallGroups}>
                          <SelectValue placeholder="Select a small group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isErrorSmallGroups && <p className="p-2 text-sm text-red-500">Error: {errorSmallGroups?.message}</p>}
                        {smallGroups.map((group: SmallGroup) => (
                          <SelectItem key={group.id} value={group.id}>{group.name} ({group.siteName})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
          )}

        </div>

        <Button type="submit" disabled={isSaving || isLoadingSites || isLoadingSmallGroups}>
          {isSaving ? 'Saving...' : 'Save Allocation'}
        </Button>
      </form>
    </Form>
  );
};
