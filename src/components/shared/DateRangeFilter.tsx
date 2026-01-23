"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Filter } from 'lucide-react';
import { getYear } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  getDateRangeFromFilterValue,
  type DateFilterValue,
  type PredefinedRange
} from '@/lib/dateUtils';
import { useTranslations, useFormatter } from 'next-intl';

// Re-export types for backward compatibility if needed, but better to use from lib
export type { DateFilterValue, PredefinedRange };

interface DateRangeFilterProps {
  onFilterChange: (filterValue: DateFilterValue) => void;
  initialRangeKey?: PredefinedRange;
  initialCustomRange?: DateRange;
  initialSpecificYear?: string;
  initialSpecificMonth?: string; // "0"-"11" or "all"
}

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

export function DateRangeFilter({
  onFilterChange,
  initialRangeKey = 'all_time',
  initialCustomRange,
  initialSpecificYear,
  initialSpecificMonth,
}: DateRangeFilterProps) {
  const t = useTranslations('DateRanges');
  const tCommon = useTranslations('Common');
  const format = useFormatter();

  const PREDEFINED_RANGES_OPTIONS: { value: PredefinedRange; label: string }[] = useMemo(() => [
    { value: 'all_time', label: t('all_time') },
    { value: 'today', label: t('today') },
    { value: 'this_week', label: t('this_week') },
    { value: 'last_week', label: t('last_week') },
    { value: 'this_month', label: t('this_month') },
    { value: 'last_month', label: t('last_month') },
    { value: 'this_year', label: t('this_year') },
    { value: 'specific_period', label: t('specific_period') },
    { value: 'last_7_days', label: t('last_7_days') },
    { value: 'last_30_days', label: t('last_30_days') },
    { value: 'last_90_days', label: t('last_90_days') },
    { value: 'last_12_months', label: t('last_12_months') },
  ], [t]);

  const MONTH_OPTIONS: { value: string; label: string }[] = useMemo(() => [
    { value: ALL_MONTHS_VALUE, label: t('all_months') },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: i.toString(),
      label: format.dateTime(new Date(0, i), { month: 'long' }),
    }))
  ], [t, format]);

  const [selectedRangeKey, setSelectedRangeKey] = useState<PredefinedRange>(initialRangeKey);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(initialCustomRange);

  const [currentSpecificYear, setCurrentSpecificYear] = useState<string | undefined>(initialSpecificYear || getYear(new Date()).toString());
  const [currentSpecificMonth, setCurrentSpecificMonth] = useState<string | undefined>(initialSpecificMonth || ALL_MONTHS_VALUE);

  const [popoverOpen, setPopoverOpen] = useState(false);

  const getDisplayLabel = React.useCallback((
    rangeKey: PredefinedRange,
    currentCustomRange?: DateRange,
    year?: string,
    month?: string // "0"-"11" or "all"
  ): string => {
    if (rangeKey === 'custom' && currentCustomRange?.from) {
      if (currentCustomRange.to) {
        return t('custom_display', {
          from: format.dateTime(currentCustomRange.from, { month: 'short', day: 'numeric', year: 'numeric' }),
          to: format.dateTime(currentCustomRange.to, { month: 'short', day: 'numeric', year: 'numeric' })
        });
      }
      return format.dateTime(currentCustomRange.from, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (rangeKey === 'specific_period' && year) {
      if (month && month !== ALL_MONTHS_VALUE) {
        const monthLabel = MONTH_OPTIONS.find(m => m.value === month)?.label || "";
        return t('specific_period_display_month', { month: monthLabel, year });
      }
      return t('specific_period_display_year', { year });
    }
    return PREDEFINED_RANGES_OPTIONS.find(r => r.value === rangeKey)?.label || t('select_range');
  }, [t, format, MONTH_OPTIONS, PREDEFINED_RANGES_OPTIONS]);

  const [displayLabel, setDisplayLabel] = useState<string>(() => getDisplayLabel(initialRangeKey, initialCustomRange, currentSpecificYear, currentSpecificMonth));

  useEffect(() => {
    setDisplayLabel(getDisplayLabel(selectedRangeKey, customDateRange, currentSpecificYear, currentSpecificMonth));
  }, [selectedRangeKey, customDateRange, currentSpecificYear, currentSpecificMonth, getDisplayLabel]);


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
          <SelectValue placeholder={t('filter_placeholder')} />
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
              <SelectValue placeholder={t('year_placeholder')} />
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
                <SelectValue placeholder={t('month_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === ALL_MONTHS_VALUE ? t('all_months_for_year', { year: currentSpecificYear }) : option.label}
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
