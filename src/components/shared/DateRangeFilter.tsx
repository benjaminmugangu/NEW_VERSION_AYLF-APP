"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Filter } from 'lucide-react';
import {
  format,
  getYear,
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  getDateRangeFromFilterValue,
  type DateFilterValue,
  type PredefinedRange
} from '@/lib/dateUtils';

// Re-export types for backward compatibility if needed, but better to use from lib
export type { DateFilterValue, PredefinedRange };

interface DateRangeFilterProps {
  onFilterChange: (filterValue: DateFilterValue) => void;
  initialRangeKey?: PredefinedRange;
  initialCustomRange?: DateRange;
  initialSpecificYear?: string;
  initialSpecificMonth?: string; // "0"-"11" or "all"
}

const PREDEFINED_RANGES_OPTIONS: { value: PredefinedRange; label: string }[] = [
  { value: 'all_time', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week (Mon-Sun)' },
  { value: 'last_week', label: 'Last Week (Mon-Sun)' },
  { value: 'this_month', label: 'This Month (Current)' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year (Current)' },
  { value: 'specific_period', label: 'Specific Year/Month' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_12_months', label: 'Last 12 Months' },
];

const ALL_MONTHS_VALUE = "all";

const generateYearOptions = () => {
  const currentYr = getYear(new Date());
  const options = [];
  // Start from 2014 up to current year + 3
  for (let year = currentYr + 3; year >= 2014; year--) {
    options.push({ value: year.toString(), label: year.toString() });
  }
  return options;
};
const YEAR_OPTIONS = generateYearOptions();

const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: ALL_MONTHS_VALUE, label: "All Months" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }))
];


export function DateRangeFilter({
  onFilterChange,
  initialRangeKey = 'all_time',
  initialCustomRange,
  initialSpecificYear,
  initialSpecificMonth,
}: DateRangeFilterProps) {
  const [selectedRangeKey, setSelectedRangeKey] = useState<PredefinedRange>(initialRangeKey);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(initialCustomRange);

  const [currentSpecificYear, setCurrentSpecificYear] = useState<string | undefined>(initialSpecificYear || getYear(new Date()).toString());
  const [currentSpecificMonth, setCurrentSpecificMonth] = useState<string | undefined>(initialSpecificMonth || ALL_MONTHS_VALUE);

  const [popoverOpen, setPopoverOpen] = useState(false);

  const getDisplayLabel = (
    rangeKey: PredefinedRange,
    currentCustomRange?: DateRange,
    year?: string,
    month?: string // "0"-"11" or "all"
  ): string => {
    if (rangeKey === 'custom' && currentCustomRange?.from) {
      if (currentCustomRange.to) {
        return `${format(currentCustomRange.from, "LLL dd, y")} - ${format(currentCustomRange.to, "LLL dd, y")}`;
      }
      return format(currentCustomRange.from, "LLL dd, y");
    }
    if (rangeKey === 'specific_period' && year) {
      if (month && month !== ALL_MONTHS_VALUE) {
        const monthLabel = MONTH_OPTIONS.find(m => m.value === month)?.label || "";
        return `Period: ${monthLabel} ${year}`;
      }
      return `Period: Year ${year}`;
    }
    return PREDEFINED_RANGES_OPTIONS.find(r => r.value === rangeKey)?.label || "Select Range";
  };

  const [displayLabel, setDisplayLabel] = useState<string>(() => getDisplayLabel(initialRangeKey, initialCustomRange, currentSpecificYear, currentSpecificMonth));

  useEffect(() => {
    setDisplayLabel(getDisplayLabel(selectedRangeKey, customDateRange, currentSpecificYear, currentSpecificMonth));
  }, [selectedRangeKey, customDateRange, currentSpecificYear, currentSpecificMonth]);


  const triggerFilterChange = (
    key: PredefinedRange,
    custom?: DateRange,
    yearVal?: string,
    monthVal?: string // "0"-"11" or "all"
  ) => {
    const newDisplayLabel = getDisplayLabel(key, custom, yearVal, monthVal);
    setDisplayLabel(newDisplayLabel);
    onFilterChange({
      rangeKey: key,
      customRange: custom,
      specificYear: yearVal,
      specificMonth: monthVal,
      display: newDisplayLabel
    });
  };

  const handleMainRangeChange = (value: PredefinedRange) => {
    setSelectedRangeKey(value);
    setCustomDateRange(undefined);

    if (value === 'specific_period') {
      const yearToUse = currentSpecificYear || getYear(new Date()).toString();
      const monthToUse = currentSpecificMonth || ALL_MONTHS_VALUE;
      setCurrentSpecificYear(yearToUse);
      setCurrentSpecificMonth(monthToUse);
      triggerFilterChange(value, undefined, yearToUse, monthToUse);
    } else {
      setCurrentSpecificYear(undefined);
      setCurrentSpecificMonth(undefined);
      triggerFilterChange(value, undefined, undefined, undefined);
    }
  };

  const handleCustomDateChange = (date: DateRange | undefined) => {
    setCustomDateRange(date);
    if (date?.from) {
      setSelectedRangeKey('custom');
      setCurrentSpecificYear(undefined);
      setCurrentSpecificMonth(undefined);
      triggerFilterChange('custom', date, undefined, undefined);
      if (date.to || !date.from) {
        setPopoverOpen(false);
      }
    } else if (!date?.from && !date?.to && selectedRangeKey === 'custom') {
      handleMainRangeChange('all_time');
    }
  };

  const handleSpecificYearChange = (year: string) => {
    setCurrentSpecificYear(year);
    const monthToUse = ALL_MONTHS_VALUE;
    setCurrentSpecificMonth(monthToUse);

    setSelectedRangeKey('specific_period');
    setCustomDateRange(undefined);
    triggerFilterChange('specific_period', undefined, year, monthToUse);
  };

  const handleSpecificMonthChange = (month: string) => {
    setCurrentSpecificMonth(month);
    const yearToUse = currentSpecificYear || getYear(new Date()).toString();
    if (!currentSpecificYear) setCurrentSpecificYear(yearToUse);

    setSelectedRangeKey('specific_period');
    setCustomDateRange(undefined);
    triggerFilterChange('specific_period', undefined, yearToUse, month);
  };

  const isCalendarDisabled = selectedRangeKey === 'specific_period' && !!currentSpecificYear;

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
      <Select value={selectedRangeKey} onValueChange={(value) => handleMainRangeChange(value as PredefinedRange)}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Filter by date" />
        </SelectTrigger>
        <SelectContent>
          {PREDEFINED_RANGES_OPTIONS.map(range => (
            <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedRangeKey === 'specific_period' && (
        <>
          <Select value={currentSpecificYear || ""} onValueChange={handleSpecificYearChange}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentSpecificYear && (
            (<Select value={currentSpecificMonth || ""} onValueChange={handleSpecificMonthChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === ALL_MONTHS_VALUE ? `All Months for ${currentSpecificYear}` : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>)
          )}
        </>
      )}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full sm:flex-grow sm:min-w-[240px] justify-start text-left font-normal"
            disabled={isCalendarDisabled}
            title={isCalendarDisabled ? "Clear 'Specific Period' to use custom range" : "Select custom date range"}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={customDateRange}
            onSelect={handleCustomDateChange}
            initialFocus
            numberOfMonths={2}
            disabled={isCalendarDisabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Keep helper for backward compatibility or use in other components if needed
export { getDateRangeFromFilterValue };
