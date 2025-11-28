'use client';

import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

export interface FilterOption {
    label: string;
    value: string;
}

export interface FilterConfig {
    key: string;
    placeholder: string;
    options: FilterOption[];
}

interface DataFilterProps {
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    filters?: FilterConfig[];
    filterValues?: Record<string, string>;
    onFilterChange?: (key: string, value: string) => void;
    children?: React.ReactNode;
    className?: string;
}

export function DataFilter({
    searchPlaceholder = 'Rechercher...',
    searchValue,
    onSearchChange,
    filters = [],
    filterValues = {},
    onFilterChange,
    children,
    className = '',
}: DataFilterProps) {
    return (
        <div className={`flex flex-col gap-4 sm:flex-row sm:items-center ${className}`}>
            {onSearchChange && (
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 items-center">
                {filters.map((filter) => (
                    <Select
                        key={filter.key}
                        value={filterValues[filter.key] || 'all'}
                        onValueChange={(value) => onFilterChange?.(filter.key, value)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={filter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            {filter.options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ))}
                {children}
            </div>
        </div>
    );
}
