'use client'

import { useTranslations, useLocale } from 'next-intl';

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface OnboardingTask {
    id: string
    label: string
    href: string
    completed: boolean
    description?: string
}

export function OnboardingChecklist() {
    const { currentUser } = useAuth()
    const t = useTranslations('Onboarding')
    const locale = useLocale();

    const tasks = useMemo<OnboardingTask[]>(() => {
        if (!currentUser) return []

        const role = currentUser.role

        // Tâches par rôle
        const tasksByRole: Record<string, OnboardingTask[]> = {
            NATIONAL_COORDINATOR: [
                {
                    id: 'profile',
                    label: t('tasks.profile.label'),
                    description: t('tasks.profile.desc'),
                    href: '/dashboard/settings/profile',
                    completed: !!currentUser.name && !!currentUser.email,
                },
                {
                    id: 'site',
                    label: t('tasks.site.label'),
                    description: t('tasks.site.desc'),
                    href: '/dashboard/sites/new',
                    completed: (currentUser as any).hasSites || false,
                },
                {
                    id: 'invite',
                    label: t('tasks.invite.label'),
                    description: t('tasks.invite.desc'),
                    href: '/dashboard/invitations',
                    completed: (currentUser as any).hasInvitations || false,
                },
                {
                    id: 'activity',
                    label: t('tasks.activity_national.label'),
                    description: t('tasks.activity_national.desc'),
                    href: '/dashboard/activities/new',
                    completed: (currentUser as any).hasActivities || false,
                },
            ],
            SITE_COORDINATOR: [













                {
                    id: 'profile',
                    label: t('tasks.profile.label'),
                    href: '/dashboard/settings/profile',
                    completed: !!currentUser.name && !!currentUser.email,
                },
                {
                    id: 'group',
                    label: t('tasks.group.label'),
                    href: `/dashboard/sites/${currentUser.siteId}/small-groups/new`,
                    completed: (currentUser as any).hasGroups || false,
                },
                {
                    id: 'members',
                    label: t('tasks.members.label'),
                    href: '/dashboard/members/new',
                    completed: (currentUser as any).hasMembers || false,
                },
                {
                    id: 'activity',
                    label: t('tasks.activity_site.label'),
                    href: '/dashboard/activities/new',
                    completed: (currentUser as any).hasActivities || false,
                },
            ],
            SMALL_GROUP_LEADER: [













                {
                    id: 'profile',
                    label: t('tasks.profile.label'),
                    href: '/dashboard/settings/profile',
                    completed: !!currentUser.name && !!currentUser.email,
                },
                {
                    id: 'members',
                    label: t('tasks.members_view.label'),
                    href: '/dashboard/members',
                    completed: (currentUser as any).viewedMembers || false,
                },
                {
                    id: 'activity',
                    label: t('tasks.activity_group.label'),
                    href: '/dashboard/activities/new',
                    completed: (currentUser as any).hasActivities || false,
                },
                {
                    id: 'report',
                    label: t('tasks.report.label'),
                    href: '/dashboard/reports/submit',
                    completed: (currentUser as any).hasReports || false,
                },
            ],
            MEMBER: [
                {
                    id: 'profile',
                    label: t('tasks.profile.label'),
                    href: '/dashboard/settings/profile',
                    completed: !!currentUser.name && !!currentUser.email,
                },
                {
                    id: 'activities',
                    label: t('tasks.activities_view.label'),
                    href: '/dashboard/activities',
                    completed: (currentUser as any).viewedActivities || false,
                },
            ],
        }

        return tasksByRole[role] || []
    }, [currentUser, t])

    const progress = useMemo(() => {
        if (tasks.length === 0) return 0
        return (tasks.filter(t => t.completed).length / tasks.length) * 100
    }, [tasks])

    const allCompleted = progress === 100

    // Ne pas afficher si toutes les tâches sont complétées
    if (allCompleted) return null

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t('title')}
                </CardTitle>
                <CardDescription>
                    {t('subtitle')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Barre de progression */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('progress')}</span>
                        <span className="font-semibold text-primary">
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        {t('tasks_completed', { count: tasks.filter(t => t.completed).length, total: tasks.length })}
                    </p>
                </div>

                {/* Liste des tâches */}
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border transition-all',
                                task.completed
                                    ? 'bg-muted/50 border-muted'
                                    : 'hover:bg-accent hover:border-accent-foreground/20 cursor-pointer'
                            )}
                        >
                            <div className="flex-shrink-0">
                                {task.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p
                                    className={cn(
                                        'font-medium',
                                        task.completed && 'line-through text-muted-foreground'
                                    )}
                                >
                                    {task.label}
                                </p>
                                {task.description && !task.completed && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {task.description}
                                    </p>
                                )}
                            </div>

                            {!task.completed && (
                                <Button asChild size="sm" variant="ghost" className="flex-shrink-0">
                                    <Link href={task.href}>
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Message d'encouragement */}
                {!allCompleted && progress > 0 && (
                    <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground text-center">
                            {t('encouragement')}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
