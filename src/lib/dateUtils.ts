import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    subWeeks,
    startOfMonth,
    endOfMonth,
    subMonths,
    startOfYear,
    endOfYear,
    subDays,
    isValid
} from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type PredefinedRange =
    | 'all_time'
    | 'today'
    | 'this_week'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'this_year'
    | 'specific_period'
    | 'last_7_days'
    | 'last_30_days'
    | 'last_90_days'
    | 'last_12_months'
    | 'custom';

export interface DateFilterValue {
    rangeKey: PredefinedRange;
    from?: string; // ISO string
    to?: string; // ISO string
    display: string;
    customRange?: DateRange;
    specificYear?: string;
    specificMonth?: string;
}

const ALL_MONTHS_VALUE = "all";

export function getDateRangeFromFilterValue(filterValue: DateFilterValue): { startDate?: Date, endDate?: Date } {
    if (filterValue.rangeKey === 'all_time' && !filterValue.customRange && !filterValue.specificYear) {
        return {};
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (filterValue.rangeKey === 'custom' && filterValue.customRange?.from) {
        startDate = startOfDay(new Date(filterValue.customRange.from));
        endDate = filterValue.customRange.to ? endOfDay(new Date(filterValue.customRange.to)) : endOfDay(new Date(filterValue.customRange.from));
    } else if (filterValue.rangeKey === 'specific_period' && filterValue.specificYear) {
        const yearNum = parseInt(filterValue.specificYear, 10);
        if (!isNaN(yearNum)) {
            if (filterValue.specificMonth && filterValue.specificMonth !== ALL_MONTHS_VALUE) {
                const monthNum = parseInt(filterValue.specificMonth, 10); // "0"-"11"
                if (!isNaN(monthNum) && monthNum >= 0 && monthNum <= 11) {
                    let dateForMonth = new Date(yearNum, monthNum, 1);
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
        const sOD = (d: Date) => startOfDay(d);
        const eOD = (d: Date) => endOfDay(d);

        switch (filterValue.rangeKey) {
            case 'today':
                startDate = sOD(now);
                endDate = eOD(now);
                break;
            case 'this_week':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                endDate = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'last_week':
                const lastWeek = subWeeks(now, 1);
                startDate = startOfWeek(lastWeek, { weekStartsOn: 1 });
                endDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
                break;
            case 'this_month':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                break;
            case 'last_month':
                const lastMonthDate = subMonths(now, 1);
                startDate = startOfMonth(lastMonthDate);
                endDate = endOfMonth(lastMonthDate);
                break;
            case 'this_year':
                startDate = startOfYear(now);
                endDate = endOfYear(now);
                break;
            case 'last_7_days':
                startDate = sOD(subDays(now, 6));
                endDate = eOD(now);
                break;
            case 'last_30_days':
                startDate = sOD(subDays(now, 29));
                endDate = eOD(now);
                break;
            case 'last_90_days':
                startDate = sOD(subDays(now, 89));
                endDate = eOD(now);
                break;
            case 'last_12_months':
                startDate = startOfMonth(subMonths(now, 11));
                endDate = eOD(now);
                break;
            default:
                return {};
        }
    }

    if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
        return { startDate, endDate };
    }
    // console.warn("Date calculation resulted in invalid dates for filter:", filterValue);
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
                // console.warn(`Invalid date string found during filtering: ${itemDateStr}`);
                return false;
            }
            return itemDate >= startDate && itemDate <= endDate;
        } catch (e) {
            console.error("Erreur détaillée dans DateRangeFilter:", e);

            return false;
        }
    });
}
