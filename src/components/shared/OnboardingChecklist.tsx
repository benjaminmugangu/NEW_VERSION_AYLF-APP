'use client'

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

    const tasks = useMemo<OnboardingTask[]>(() => {
        if (!currentUser) return []

        const role = currentUser.role

        // Tâches par rôle
        const tasksByRole: Record<string, OnboardingTask[]> = {
            national_coordinator: [
                {
                    id: 'profile',
                    label: 'Compléter votre profil',
                    description: 'Ajoutez vos informations personnelles',
                    href: '/dashboard/settings/profile',
                    completed: !!currentUser.name && !!currentUser.email,
                },
                {
                    id: 'site',
                    label: 'Créer votre premier site',
                    description: 'Un site regroupe plusieurs petits groupes',
                    href: '/dashboard/sites/new',
                    completed: (currentUser as any).hasSites || false,
                },
                {
                    id: 'invite',
                    label: 'Inviter un coordinateur',
                    description: 'Invitez des coordinateurs de sites',
                    href: '/dashboard/invitations',
                    completed: (currentUser as any).hasInvitations || false,
                },
                {
                    id: 'activity',
                    label: 'Planifier une activité',
                    description: 'Créez votre première activité nationale',
                    href: '/dashboard/activities/new',
                    completed: (currentUser as any).hasActivities || false,
                },
            ],
            site_coordinator: [
                {
                    id: 'profile',
                    label: 'Compléter votre profil',
                    href: '/dashboard/settings/profile',
                    completed: !!currentUser.name && !!currentUser.email,
                },
                {
                    id: 'group',
                    label: 'Créer un petit groupe',
                    href: `/dashboard/sites/${currentUser.siteId}/small-groups/new`,
                    completed: (currentUser as any).hasGroups || false,
                },
                {
                    id: 'members',
                    label: 'Ajouter des membres',
                    href: '/dashboard/members/new',
                    completed: (currentUser as any).hasMembers || false,
                },
                {
                    id: 'activity',
                    label: 'Planifier une activité de site',
                    href: '/dashboard/activities/new',
                    completed: (currentUser as any).hasActivities || false,
                },
            ],
            small_group_leader: [
                {
                    id: 'profile',
                    label: 'Compléter votre profil',
                    href: '/dashboard/settings/profile',
                    completed: !!currentUser.name && !!currentUser.email,
                },
                {
                    id: 'members',
                    label: 'Voir les membres de votre groupe',
                    href: '/dashboard/members',
                    completed: (currentUser as any).viewedMembers || false,
                },
                {
                    id: 'activity',
                    label: 'Planifier votre première activité',
                    href: '/dashboard/activities/new',
                    completed: (currentUser as any).hasActivities || false,
                },
                {
                    id: 'report',
                    label: 'Soumettre un rapport d\'activité',
                    href: '/dashboard/reports/submit',
                    completed: (currentUser as any).hasReports || false,
                },
            ],
            member: [
                {
                    id: 'profile',
                    label: 'Compléter votre profil',
                    href: '/dashboard/settings/profile',
                    completed: !!currentUser.name && !!currentUser.email,
                },
                {
                    id: 'activities',
                    label: 'Voir les activités à venir',
                    href: '/dashboard/activities',
                    completed: (currentUser as any).viewedActivities || false,
                },
            ],
        }

        return tasksByRole[role] || []
    }, [currentUser])

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
                    Premiers Pas
                </CardTitle>
                <CardDescription>
                    Complétez ces étapes pour bien démarrer avec AYLF
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Barre de progression */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-semibold text-primary">
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        {tasks.filter(t => t.completed).length} sur {tasks.length} tâches complétées
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
                            👏 Bon travail! Continuez ainsi pour maîtriser AYLF
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
