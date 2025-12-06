'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty, CommandSeparator } from '@/components/ui/command'
import { Home, Calendar, Users, FileText, Building, DollarSign, Settings, Plus, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()
    const { currentUser } = useAuth()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Tapez une commande ou recherchez..." />
            <CommandList>
                <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

                <CommandGroup heading="Navigation">
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard'))}
                    >
                        <Home className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/activities'))}
                    >
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Activités</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/members'))}
                    >
                        <Users className="mr-2 h-4 w-4" />
                        <span>Membres</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/reports'))}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Rapports</span>
                    </CommandItem>
                    {currentUser?.role === 'national_coordinator' && (
                        <CommandItem
                            onSelect={() => runCommand(() => router.push('/dashboard/sites'))}
                        >
                            <Building className="mr-2 h-4 w-4" />
                            <span>Sites</span>
                        </CommandItem>
                    )}
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/finances'))}
                    >
                        <DollarSign className="mr-2 h-4 w-4" />
                        <span>Finances</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/analytics'))}
                    >
                        <Search className="mr-2 h-4 w-4" />
                        <span>Analytics</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Actions Rapides">
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/activities/new'))}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Nouvelle Activité</span>
                        <span className="ml-auto text-xs text-muted-foreground">⌘N</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/reports/submit'))}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Soumettre Rapport</span>
                    </CommandItem>
                    {currentUser?.role === 'national_coordinator' && (
                        <>
                            <CommandItem
                                onSelect={() => runCommand(() => router.push('/dashboard/sites/new'))}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Nouveau Site</span>
                            </CommandItem>
                            <CommandItem
                                onSelect={() => runCommand(() => router.push('/dashboard/users/new'))}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Inviter Utilisateur</span>
                            </CommandItem>
                        </>
                    )}
                    {currentUser?.role === 'site_coordinator' && (
                        <CommandItem
                            onSelect={() => runCommand(() => router.push('/dashboard/small-groups/new'))}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            <span>Nouveau Groupe</span>
                        </CommandItem>
                    )}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Configuration">
                    <CommandItem
                        onSelect={() => runCommand(() => router.push('/dashboard/profile'))}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Mon Profil</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
