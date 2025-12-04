/**
 * Centralized French messages for the application
 * Used for consistent error messages, notifications, and UI text
 */

export const MESSAGES = {
    // Errors
    errors: {
        generic: 'Une erreur est survenue. Veuillez réessayer.',
        unauthorized: 'Vous n\'êtes pas autorisé à accéder à cette ressource.',
        forbidden: 'Accès refusé.',
        notFound: 'Ressource non trouvée.',
        validation: 'Données invalides. Veuillez vérifier votre saisie.',
        network: 'Erreur de connexion. Vérifiez votre connexion internet.',
        serverError: 'Erreur du serveur. Veuillez réessayer plus tard.',
        sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
        rateLimited: 'Trop de requêtes. Veuillez réessayer plus tard.',
    },

    // Success messages
    success: {
        saved: 'Enregistré avec succès.',
        created: 'Créé avec succès.',
        updated: 'Mis à jour avec succès.',
        deleted: 'Supprimé avec succès.',
        exported: 'Exporté avec succès.',
        sent: 'Envoyé avec succès.',
        approved: 'Approuvé avec succès.',
        rejected: 'Rejeté avec succès.',
    },

    // Confirmations
    confirmations: {
        delete: 'Êtes-vous sûr de vouloir supprimer cet élément ?',
        cancel: 'Êtes-vous sûr de vouloir annuler ? Les modifications non enregistrées seront perdues.',
        submit: 'Confirmer la soumission ?',
        approve: 'Confirmer l\'approbation ?',
        reject: 'Confirmer le rejet ?',
    },

    // Loading states
    loading: {
        generic: 'Chargement...',
        saving: 'Enregistrement...',
        creating: 'Création...',
        updating: 'Mise à jour...',
        deleting: 'Suppression...',
        exporting: 'Exportation...',
        processing: 'Traitement en cours...',
    },

    // Empty states
    empty: {
        noResults: 'Aucun résultat.',
        noData: 'Aucune donnée disponible.',
        noActivities: 'Aucune activité trouvée.',
        noReports: 'Aucun rapport trouvé.',
        noMembers: 'Aucun membre trouvé.',
        noTransactions: 'Aucune transaction trouvée.',
        noAllocations: 'Aucune allocation trouvée.',
        noSites: 'Aucun site trouvé.',
        noGroups: 'Aucun groupe trouvé.',
    },

    // Pagination
    pagination: {
        rowsPerPage: 'Lignes par page',
        page: 'Page',
        of: 'sur',
        total: 'total',
        previous: 'Précédent',
        next: 'Suivant',
        first: 'Première',
        last: 'Dernière',
    },

    // Forms
    forms: {
        required: 'Champ obligatoire',
        selectPlaceholder: 'Sélectionnez une option',
        datePlaceholder: 'Choisir une date',
        searchPlaceholder: 'Rechercher...',
        cancel: 'Annuler',
        save: 'Enregistrer',
        submit: 'Soumettre',
        create: 'Créer',
        update: 'Mettre à jour',
        delete: 'Supprimer',
        confirm: 'Confirmer',
        columns: 'Colonnes',
    },

    // Financial
    financial: {
        budgetAvailable: 'Budget disponible',
        budgetExceeded: 'Montant dépasse le budget disponible',
        totalIncome: 'Total des revenus',
        totalExpenses: 'Total des dépenses',
        balance: 'Solde',
        allocation: 'Allocation',
        transaction: 'Transaction',
    },

    // Reports
    reports: {
        pending: 'En attente',
        submitted: 'Soumis',
        approved: 'Approuvé',
        rejected: 'Rejeté',
        rejectionReason: 'Raison du rejet',
        reviewNotes: 'Notes de révision',
    },

    // Activities
    activities: {
        planned: 'Planifiée',
        inProgress: 'En cours',
        delayed: 'Retardée',
        executed: 'Exécutée',
        canceled: 'Annulée',
    },

    // Roles
    roles: {
        national_coordinator: 'Coordinateur National',
        site_coordinator: 'Coordinateur de Site',
        small_group_leader: 'Leader de Petit Groupe',
        member: 'Membre',
    },
} as const;

/**
 * Get localized role name
 */
export function getRoleName(role: string): string {
    return MESSAGES.roles[role as keyof typeof MESSAGES.roles] || role;
}

/**
 * Get localized status name for activities
 */
export function getActivityStatusName(status: string): string {
    const statusMap: Record<string, string> = {
        planned: MESSAGES.activities.planned,
        in_progress: MESSAGES.activities.inProgress,
        delayed: MESSAGES.activities.delayed,
        executed: MESSAGES.activities.executed,
        canceled: MESSAGES.activities.canceled,
    };
    return statusMap[status] || status;
}

/**
 * Get localized status name for reports
 */
export function getReportStatusName(status: string): string {
    const statusMap: Record<string, string> = {
        pending: MESSAGES.reports.pending,
        submitted: MESSAGES.reports.submitted,
        approved: MESSAGES.reports.approved,
        rejected: MESSAGES.reports.rejected,
    };
    return statusMap[status] || status;
}
