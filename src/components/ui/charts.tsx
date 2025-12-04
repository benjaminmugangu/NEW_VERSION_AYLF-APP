'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Recharts components for better bundle splitting
const LazyBarChart = dynamic(
    () => import('recharts').then(mod => mod.BarChart),
    {
        loading: () => <Skeleton className="h-full w-full" />,
        ssr: false
    }
);

const LazyPieChart = dynamic(
    () => import('recharts').then(mod => mod.PieChart),
    {
        loading: () => <Skeleton className="h-full w-full" />,
        ssr: false
    }
);

const LazyLineChart = dynamic(
    () => import('recharts').then(mod => mod.LineChart),
    {
        loading: () => <Skeleton className="h-full w-full" />,
        ssr: false
    }
);

// Re-export other Recharts components that are small and don't need lazy loading
export {
    Bar,
    Pie,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

export { LazyBarChart as BarChart, LazyPieChart as PieChart, LazyLineChart as LineChart };
