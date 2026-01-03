'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/contexts/AuthContext'

interface TourStep {
    target: string
    title: string
    content: string
    position?: 'top' | 'bottom' | 'left' | 'right'
}

const TOURS_BY_ROLE: Record<string, TourStep[]> = {
    NATIONAL_COORDINATOR: [
        {
            target: '[data-tour="sidebar"]',
            title: '🎯 Bienvenue, Coordinateur National!',
            content: 'Voici votre menu de navigation. Explorons les fonctionnalités principales.',
            position: 'right'
        },
        {
            target: '[data-tour="create-site"]',
            title: '🏢 Gérer les Sites',
            content: 'Créez et gérez tous les sites AYLF à travers le pays.',
            position: 'right'
        },
        {
            target: '[data-tour="invite-user"]',
            title: '👥 Inviter des Coordinateurs',
            content: 'Invitez des coordinateurs de site et des leaders de groupe.',
            position: 'right'
        },
        {
            target: '[data-tour="finances"]',
            title: '💰 Gérer les Finances',
            content: 'Suivez le budget national et allouez des fonds aux sites.',
            position: 'right'
        },
        {
            target: '[data-tour="reports"]',
            title: '📊 Valider les Rapports',
            content: 'Approuvez ou rejetez les rapports des sites.',
            position: 'right'
        }
    ],
    SITE_COORDINATOR: [
        {
            target: '[data-tour="sidebar"]',
            title: '🎯 Bienvenue, Coordinateur de Site!',
            content: 'Voici votre tableau de bord. Gérons votre site ensemble.',
            position: 'right'
        },
        {
            target: '[data-tour="activities"]',
            title: '📅 Planifier des Activités',
            content: 'Organisez des activités pour vos petits groupes.',
            position: 'right'
        },
        {
            target: '[data-tour="finances"]',
            title: '💰 Budget du Site',
            content: 'Gérez le budget de votre site et suivez les dépenses.',
            position: 'right'
        },
        {
            target: '[data-tour="members"]',
            title: '👥 Gérer les Membres',
            content: 'Consultez tous les membres de votre site.',
            position: 'right'
        }
    ],
    SMALL_GROUP_LEADER: [
        {
            target: '[data-tour="sidebar"]',
            title: '🎯 Bienvenue, Leader de Petit Groupe!',
            content: 'Découvrons comment gérer votre petit groupe.',
            position: 'right'
        },
        {
            target: '[data-tour="activities"]',
            title: '📅 Vos Activités',
            content: 'Consultez et suivez les activités de votre groupe.',
            position: 'right'
        },
        {
            target: '[data-tour="submit-report"]',
            title: '📝 Soumettre des Rapports',
            content: 'Soumettez des rapports après chaque activité.',
            position: 'right'
        },
        {
            target: '[data-tour="members"]',
            title: '👥 Vos Membres',
            content: 'Gérez les membres de votre petit groupe.',
            position: 'right'
        },
        {
            target: '[data-tour="finances"]',
            title: '💰 Budget du Groupe',
            content: 'Suivez le budget et les dépenses de votre groupe.',
            position: 'right'
        }
    ],
    MEMBER: [
        {
            target: '[data-tour="sidebar"]',
            title: '🎯 Bienvenue dans AYLF Connect!',
            content: 'Voici votre espace personnel.',
            position: 'right'
        },
        {
            target: '[data-tour="activities"]',
            title: '📅 Vos Activités',
            content: 'Consultez les activités de votre groupe.',
            position: 'right'
        },
        {
            target: '[data-tour="profile"]',
            title: '👤 Votre Profil',
            content: 'Mettez à jour vos informations personnelles.',
            position: 'right'
        }
    ]
}

export function CustomOnboardingTour() {
    const { currentUser } = useCurrentUser()
    const [currentStep, setCurrentStep] = useState(0)
    const [isActive, setIsActive] = useState(false)
    const [tourSteps, setTourSteps] = useState<TourStep[]>([])
    const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)

    useEffect(() => {
        if (!currentUser) return

        const hasSeenTour = localStorage.getItem(`tour_seen_${currentUser.id}`)
        if (hasSeenTour) return

        // Délai pour laisser la page se charger
        const timer = setTimeout(() => {
            const steps = TOURS_BY_ROLE[currentUser.role] || TOURS_BY_ROLE.MEMBER
            setTourSteps(steps)
            setIsActive(true)
            setCurrentStep(0)
        }, 1000)

        return () => clearTimeout(timer)
    }, [currentUser])

    useEffect(() => {
        if (!isActive || !tourSteps[currentStep]) return

        const targetSelector = tourSteps[currentStep].target
        const element = document.querySelector(targetSelector) as HTMLElement

        if (element) {
            setHighlightedElement(element)
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [currentStep, isActive, tourSteps])

    const handleNext = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            completeTour()
        }
    }

    const handleSkip = () => {
        completeTour()
    }

    const completeTour = () => {
        setIsActive(false)
        setHighlightedElement(null)
        if (currentUser) {
            localStorage.setItem(`tour_seen_${currentUser.id}`, 'true')
        }
    }

    if (!isActive || !tourSteps[currentStep] || !highlightedElement) return null

    const step = tourSteps[currentStep]
    const rect = highlightedElement.getBoundingClientRect()

    return (
        <>
            {/* Overlay sombre */}
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={handleSkip} />

            {/* Spotlight sur l'élément */}
            <div
                className="fixed z-[9999] pointer-events-none"
                style={{
                    top: rect.top - 4,
                    left: rect.left - 4,
                    width: rect.width + 8,
                    height: rect.height + 8,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    borderRadius: '8px',
                    border: '2px solid hsl(var(--primary))',
                    transition: 'all 0.3s ease'
                }}
            />

            {/* Tooltip */}
            <div
                className="fixed z-[10000] bg-card border border-border rounded-lg shadow-xl p-6 max-w-sm animate-in fade-in zoom-in"
                style={{
                    top: rect.bottom + 16,
                    left: Math.max(16, Math.min(rect.left, window.innerWidth - 400))
                }}
            >
                <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mt-2 -mr-2"
                        onClick={handleSkip}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{step.content}</p>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {currentStep + 1} / {tourSteps.length}
                    </span>

                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleSkip}>
                            Passer
                        </Button>
                        <Button size="sm" onClick={handleNext}>
                            {currentStep < tourSteps.length - 1 ? 'Suivant' : 'Terminer'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
