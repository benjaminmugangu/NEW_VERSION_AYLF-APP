
// src/components/shared/DateRangeFilter.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Filter } from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  subDays, 
  subMonths,
  subWeeks,
  startOfDay,
  endOfDay,
  isValid,
  getYear,
  getMonth,
  setYear,
  setMonth
} from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type PredefinedRange = 
  | 'all_time' 
  | 'today' 
  | 'this_week' 
  | 'last_week'
  | 'this_month' 
  | 'last_month' // Added
  | 'this_year'
  | 'specific_period' // For Year/Month selection via dropdowns
  | 'last_7_days' 
  | 'last_30_days' 
  | 'last_90_days'
  | 'last_12_months'
  | 'custom'; // For when the popover calendar is used directly

export interface DateFilterValue {
  rangeKey: PredefinedRange;
  customRange?: DateRange;
  specificYear?: string; 
  specificMonth?: string; // "0"-"11" (for specific month), or "all" (for whole year via specific_period)
  display: string;
}

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
  { value: 'last_month', label: 'Last Month' }, // Added
  { value: 'this_year', label: 'This Year (Current)' },
  { value: 'specific_period', label: 'Specific Year/Month' }, // Renamed for clarity
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_12_months', label: 'Last 12 Months' },
];

const ALL_MONTHS_VALUE = "all"; // Represents selecting the entire year

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
  { value: ALL_MONTHS_VALUE, label: "All Months" }, // For selecting the whole year
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
    setCustomDateRange(undefined); // Clear custom range when a predefined is chosen

    if (value === 'specific_period') {
      // When "Specific Period" is chosen, ensure year/month selectors are ready
      const yearToUse = currentSpecificYear || getYear(new Date()).toString();
      const monthToUse = currentSpecificMonth || ALL_MONTHS_VALUE;
      setCurrentSpecificYear(yearToUse); // Make sure they are set if not already
      setCurrentSpecificMonth(monthToUse);
      triggerFilterChange(value, undefined, yearToUse, monthToUse);
    } else {
      // For other predefined ranges, clear specific year/month and trigger change
      setCurrentSpecificYear(undefined); 
      setCurrentSpecificMonth(undefined);
      triggerFilterChange(value, undefined, undefined, undefined);
    }
  };

  const handleCustomDateChange = (date: DateRange | undefined) => {
    setCustomDateRange(date);
    if (date?.from) {
      setSelectedRangeKey('custom'); // Explicitly set to 'custom' when calendar is used
      setCurrentSpecificYear(undefined); 
      setCurrentSpecificMonth(undefined);
      triggerFilterChange('custom', date, undefined, undefined);
      if (date.to || !date.from) { // Close popover if a full range is selected or date is cleared
         setPopoverOpen(false);
      }
    } else if (!date?.from && !date?.to && selectedRangeKey === 'custom') { 
      // If custom date is cleared, revert to 'all_time'
      handleMainRangeChange('all_time'); 
    }
  };

  const handleSpecificYearChange = (year: string) => {
    setCurrentSpecificYear(year);
    // When year changes, default month to "All Months" for that year
    const monthToUse = ALL_MONTHS_VALUE;
    setCurrentSpecificMonth(monthToUse);
    
    setSelectedRangeKey('specific_period'); 
    setCustomDateRange(undefined);
    triggerFilterChange('specific_period', undefined, year, monthToUse);
  };

  const handleSpecificMonthChange = (month: string) => {
    setCurrentSpecificMonth(month);
    const yearToUse = currentSpecificYear || getYear(new Date()).toString(); // Should already be set
    if(!currentSpecificYear) setCurrentSpecificYear(yearToUse);
    
    setSelectedRangeKey('specific_period');
    setCustomDateRange(undefined);
    triggerFilterChange('specific_period', undefined, yearToUse, month);
  };
  
  // Disable calendar popover if a specific period (Year/Month via dropdowns) is active
  const isCalendarDisabled = selectedRangeKey === 'specific_period' && !!currentSpecificYear;

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
      <Select value={selectedRangeKey} onValueChange={(value) => handleMainRangeChange(value as PredefinedRange)}>
        <SelectTrigger className="w-full sm:w-[200px]"> {/* Adjusted width */}
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
          
          {currentSpecificYear && ( // Only show month selector if a year is selected
            (<Select value={currentSpecificMonth || ""} onValueChange={handleSpecificMonthChange}>
              <SelectTrigger className="w-full sm:w-[180px]"> {/* Adjusted width */}
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
            disabled={isCalendarDisabled} // Disable if specific year/month is active
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

export function getDateRangeFromFilterValue(filterValue: DateFilterValue): { startDate?: Date, endDate?: Date } {
  if (filterValue.rangeKey === 'all_time' && !filterValue.customRange && !filterValue.specificYear) {
    return {};
  }

  let startDate: Date | undefined;
  let endDate: Date | undefined; 

  if (filterValue.rangeKey === 'custom' && filterValue.customRange?.from) {
    startDate = startOfDay(filterValue.customRange.from);
    endDate = filterValue.customRange.to ? endOfDay(filterValue.customRange.to) : endOfDay(filterValue.customRange.from);
  } else if (filterValue.rangeKey === 'specific_period' && filterValue.specificYear) {
      const yearNum = parseInt(filterValue.specificYear, 10);
      if (!isNaN(yearNum)) {
        if (filterValue.specificMonth && filterValue.specificMonth !== ALL_MONTHS_VALUE) {
            const monthNum = parseInt(filterValue.specificMonth, 10); // "0"-"11"
            if (!isNaN(monthNum) && monthNum >= 0 && monthNum <= 11) {
                let dateForMonth = new Date(yearNum, monthNum, 1); // Use yearNum directly
                startDate = startOfMonth(dateForMonth);
                endDate = endOfMonth(dateForMonth);
            } else { 
                startDate = startOfYear(new Date(yearNum, 0, 1));
                endDate = endOfYear(new Date(yearNum, 11, 31));
            }
        } else { // No specific month or "All Months" selected, filter by entire year
            startDate = startOfYear(new Date(yearNum, 0, 1));
            endDate = endOfYear(new Date(yearNum, 11, 31));
        }
      }
  } else {
    const now = new Date();
    switch (filterValue.rangeKey) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'this_week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); 
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'last_week': 
        startDate = startOfDay(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
        endDate = endOfDay(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
        break;
      case 'this_month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last_month': // Added
        const lastMonthDate = subMonths(now, 1);
        startDate = startOfMonth(lastMonthDate);
        endDate = endOfMonth(lastMonthDate);
        break;
        case 'this_year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'last_7_days':
        startDate = startOfDay(subDays(now, 6)); 
        endDate = endOfDay(now);
        break;
      case 'last_30_days':
        startDate = startOfDay(subDays(now, 29));
        endDate = endOfDay(now);
        break;
      case 'last_90_days':
        startDate = startOfDay(subDays(now, 89));
        endDate = endOfDay(now);
        break;
      case 'last_12_months':
        startDate = startOfDay(startOfMonth(subMonths(now, 11))); 
        endDate = endOfDay(now); 
        break;
      default: 
        return {}; 
    }
  }
  
  if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
    return { startDate, endDate };
  }
  console.warn("Date calculation resulted in invalid dates for filter:", filterValue);
  return {};
}


export function applyDateFilter<T>( 
  items: T[],
  dateKey: keyof T,
  filterValue: DateFilterValue | undefined
): T[] {
  if (!items) return [];
  if (!filterValue || (filterValue.rangeKey === 'all_time' && !filterValue.customRange && !filterValue.specificYear && !filterValue.specificMonth)) {
    return items;
  }

  const { startDate, endDate } = getDateRangeFromFilterValue(filterValue);

  if (!startDate || !endDate) {
     if (filterValue.rangeKey === 'all_time') return items; 
     return []; 
  }
  
  return items.filter(item => {
    const itemDateStr = item[dateKey];
    if (typeof itemDateStr !== 'string') return false; 
    
    try {
      const itemDate = new Date(itemDateStr);
      if (!isValid(itemDate)) {
          console.warn(`Invalid date string found during filtering: ${itemDateStr}`);
          return false;
      }
      return itemDate >= startDate && itemDate <= endDate;
    } catch (e) {

      return false;
    }
  });
}

