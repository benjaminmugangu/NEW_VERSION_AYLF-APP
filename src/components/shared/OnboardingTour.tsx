'use client'

import { useEffect, useState, useCallback } from 'react'
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride'
import { useAuth } from '@/hooks/useAuth'

// Steps pour National Coordinator
const NATIONAL_COORDINATOR_STEPS: Step[] = [
    {
        target: '[data-tour="sidebar"]',
        content: '👋 Bienvenue! Utilisez cette barre latérale pour naviguer entre les différentes sections de l\'application.',
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '[data-tour="create-site"]',
        content: '🏢 Commencez par créer votre premier site. Un site regroupe plusieurs petits groupes et a un coordinateur dédié.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="invite-user"]',
        content: '📧 Invitez des coordinateurs de sites et des leaders de petits groupes à rejoindre la plateforme.',
        placement: 'left',
    },
    {
        target: '[data-tour="finances"]',
        content: '💰 Gérez vos allocations budgétaires ici. Vous pouvez transférer des fonds aux sites et suivre les dépenses.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="reports"]',
        content: '📝 Validez les rapports d\'activités soumis par les leaders. Les rapports approuvés génèrent automatiquement des transactions financières.',
        placement: 'bottom',
    },
]

// Steps pour Site Coordinator
const SITE_COORDINATOR_STEPS: Step[] = [
    {
        target: '[data-tour="sidebar"]',
        content: '👋 Bienvenue! Cette barre latérale vous permet d\'accéder à toutes les fonctionnalités.',
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '[data-tour="site-details"]',
        content: '🏢 Consultez les détails de votre site et ses petits groupes.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="finances"]',
        content: '💰 Gérez le budget de votre site. Vous pouvez effectuer des transferts aux petits groupes.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="members"]',
        content: '👥 Gérez les membres de votre site répartis dans différents petits groupes.',
        placement: 'left',
    },
]

// Steps pour Small Group Leader
const SMALL_GROUP_LEADER_STEPS: Step[] = [
    {
        target: '[data-tour="sidebar"]',
        content: '👋 Bienvenue! Voici votre espace de gestion de petit groupe.',
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '[data-tour="activities"]',
        content: '📅 Créez et planifiez vos activités de groupe ici. N\'oubliez pas de mettre à jour leur statut!',
        placement: 'bottom',
    },
    {
        target: '[data-tour="submit-report"]',
        content: '📝 Après chaque activité, soumettez un rapport détaillé pour validation par le coordinateur national.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="members"]',
        content: '👥 Gérez les membres de votre petit groupe.',
        placement: 'left',
    },
    {
        target: '[data-tour="finances"]',
        content: '💰 Consultez le budget disponible pour vos activités.',
        placement: 'bottom',
    },
]

// Steps pour Member
const MEMBER_STEPS: Step[] = [
    {
        target: '[data-tour="sidebar"]',
        content: '👋 Bienvenue sur AYLF! Voici votre tableau de bord personnel.',
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '[data-tour="activities"]',
        content: '📅 Consultez les activités à venir de votre petit groupe.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="profile"]',
        content: '👤 Mettez à jour vos informations personnelles ici.',
        placement: 'left',
    },
]

const STEPS_BY_ROLE: Record<string, Step[]> = {
    NATIONAL_COORDINATOR: NATIONAL_COORDINATOR_STEPS,
    SITE_COORDINATOR: SITE_COORDINATOR_STEPS,
    SMALL_GROUP_LEADER: SMALL_GROUP_LEADER_STEPS,
    MEMBER: MEMBER_STEPS,
}

export function OnboardingTour() {
    const { currentUser } = useAuth()
    const [run, setRun] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)

    useEffect(() => {
        if (!currentUser) return

        // Vérifier si l'utilisateur a déjà vu le tour
        const hasSeenTour = localStorage.getItem(`onboarding_seen_${currentUser.id}`)

        if (!hasSeenTour) {
            // Délai de 1 seconde pour laisser le temps à la page de charger
            const timer = setTimeout(() => {
                setRun(true)
            }, 1000)

            return () => clearTimeout(timer)
        }
    }, [currentUser])

    const handleJoyrideCallback = useCallback((data: CallBackProps) => {
        const { status, type, action, index } = data
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

        if (finishedStatuses.includes(status)) {
            // Marquer le tour comme vu
            if (currentUser) {
                localStorage.setItem(`onboarding_seen_${currentUser.id}`, 'true')
            }
            setRun(false)
            setStepIndex(0)
        } else if (type === EVENTS.STEP_AFTER) {
            // Passer à l'étape suivante
            setStepIndex(index + (action === 'prev' ? -1 : 1))
        }
    }, [currentUser])

    if (!currentUser || !currentUser.role) return null

    const steps = STEPS_BY_ROLE[currentUser.role] || []

    if (steps.length === 0) return null

    return (
        <Joyride
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#0070f3',
                    zIndex: 10000,
                    arrowColor: '#fff',
                    backgroundColor: '#fff',
                    overlayColor: 'rgba(0, 0, 0, 0.5)',
                    spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
                    textColor: '#333',
                },
                tooltip: {
                    borderRadius: 8,
                    padding: 20,
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                buttonNext: {
                    backgroundColor: '#0070f3',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 14,
                },
                buttonBack: {
                    color: '#666',
                    marginRight: 10,
                },
                buttonSkip: {
                    color: '#999',
                },
            }}
            locale={{
                back: 'Retour',
                close: 'Fermer',
                last: 'Terminer',
                next: 'Suivant',
                open: 'Ouvrir',
                skip: 'Passer le guide',
            }}
            floaterProps={{
                disableAnimation: false,
            }}
        />
    )
}
