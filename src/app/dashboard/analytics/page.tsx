'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Activity, Users, DollarSign, FileText } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AdvancedDashboard() {
    const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month')

    const { data: analytics, isLoading } = useQuery({
        queryKey: ['analytics', timeRange],
        queryFn: async () => {
            const res = await fetch(`/api/analytics?timeRange=${timeRange}`)
            if (!res.ok) throw new Error('Failed to fetch analytics')
            return res.json()
        },
    })

    if (isLoading) {
        return <div className="p-8 text-center">Chargement des analytiques...</div>
    }

    if (!analytics) {
        return <div className="p-8 text-center text-muted-foreground">Aucune donnée disponible</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Analytiques Avancées</h2>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="month">6 derniers mois</SelectItem>
                        <SelectItem value="quarter">12 derniers mois</SelectItem>
                        <SelectItem value="year">3 dernières années</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Membres Actifs"
                    value={analytics.metrics.activeMembers}
                    icon={Users}
                    color="text-blue-500"
                />
                <MetricCard
                    title="Activités en Cours"
                    value={analytics.metrics.ongoingActivities}
                    icon={Activity}
                    color="text-green-500"
                />
                <MetricCard
                    title="Rapports en Attente"
                    value={analytics.metrics.pendingReports}
                    icon={FileText}
                    color="text-orange-500"
                />
                <MetricCard
                    title="Utilisation Budget"
                    value={`${analytics.metrics.budgetUtilization}%`}
                    icon={DollarSign}
                    color="text-purple-500"
                    trend={analytics.metrics.budgetUtilization > 80 ? 'up' : 'down'}
                />
            </div>

            {/* Trends Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Croissance des Membres</CardTitle>
                        <CardDescription>Évolution du nombre de membres au fil du temps</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.trends.memberGrowth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="count" stroke="#0088FE" strokeWidth={2} name="Membres" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Activités Complétées</CardTitle>
                        <CardDescription>Nombre d'activités exécutées par mois</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.trends.activityCompletion}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#00C49F" name="Complétées" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Comparisons */}
            {analytics.comparisons.sitePerformance.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance par Site</CardTitle>
                            <CardDescription>Taux de complétion des activités</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.comparisons.sitePerformance}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="siteName" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="completionRate" fill="#8884D8" name="% Complétion" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Types d'Activités</CardTitle>
                            <CardDescription>Distribution par type</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={analytics.comparisons.activityTypes}
                                        dataKey="count"
                                        nameKey="type"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {analytics.comparisons.activityTypes.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Budget Forecast */}
            <Card>
                <CardHeader>
                    <CardTitle>Prévisions Budgétaires</CardTitle>
                    <CardDescription>Projection des dépenses futures basée sur la moyenne</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={analytics.trends.budgetForecast}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#FF8042"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                name="Dépenses Prévues (FC)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}

function MetricCard({
    title,
    value,
    icon: Icon,
    color,
    trend,
}: {
    title: string
    value: string | number
    icon: any
    color: string
    trend?: 'up' | 'down'
}) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-2">{value}</p>
                    </div>
                    <div className={cn('p-3 rounded-full bg-muted', color)}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>
                {trend && (
                    <div className="mt-4 flex items-center gap-1 text-sm">
                        {trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                            {trend === 'up' ? 'En hausse' : 'En baisse'}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
