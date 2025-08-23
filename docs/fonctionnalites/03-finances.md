# 3.3. Fonctionnalité : Gestion des Finances

Le module financier est conçu pour suivre les flux monétaires au sein de l'organisation, en respectant une structure hiérarchique claire (National -> Site -> Petit Groupe).

## Fichiers Clés

-   **Services** : `src/services/transactionService.ts`, `src/services/allocationService.ts`
-   **Hooks** : `src/hooks/useTransactions.ts`, `src/hooks/useAllocations.ts`
-   **Pages** : `/dashboard/finances`, `/dashboard/financials` (et leurs sous-routes)
-   **Composants** : `TransactionForm.tsx`, `TransactionTable.tsx`
-   **Types** : `Transaction`, `Allocation` dans `src/lib/types.ts`

## Logique Métier

La logique financière est strictement basée sur le rôle de l'utilisateur connecté.

### 1. Hiérarchie et Rôles

-   **Coordinateur National (`NATIONAL_COORDINATOR`)** :
    -   Gère le budget national.
    -   Peut créer des transactions de type "Revenu" (income) pour le niveau national.
    -   Peut créer des transactions de type "Dépense" (expense) pour le niveau national.
    -   Peut allouer des fonds aux sites via des transactions de type "Transfert" (transfer).
    -   A une vue d'ensemble de toutes les transactions financières de l'organisation.

-   **Coordinateur de Site (`SITE_COORDINATOR`)** :
    -   Gère les fonds reçus du niveau national.
    -   Peut déclarer des dépenses spécifiques à son site.
    -   Peut réallouer des fonds aux petits groupes qui lui sont rattachés.
    -   Ne peut voir que les transactions concernant son site et ses petits groupes.

-   **Chef de Petit Groupe (`SMALL_GROUP_LEADER`)** :
    -   Ne peut pas créer de transactions financières directes.
    -   Les dépenses sont déclarées indirectement via les rapports d'activité.
    -   A une vue limitée aux fonds reçus de son site et à ses dépenses déclarées.

### 2. Types de Transactions

-   **Revenu (Income)** : Fonds reçus par une entité (principalement au niveau national).
-   **Dépense (Expense)** : Fonds dépensés par une entité pour ses opérations.
-   **Transfert/Allocation (Transfer)** : Mouvement de fonds d'une entité supérieure à une entité inférieure (National -> Site, ou Site -> Petit Groupe).

### 3. Processus et Composants

-   **Formulaire de Transaction (`TransactionForm.tsx`)** : Un formulaire réutilisable et dynamique permet de créer les différents types de transactions. Les champs du formulaire s'adaptent en fonction du type de transaction sélectionné (ex: le champ "Bénéficiaire" n'apparaît que pour un transfert).
-   **Tableaux de Données (`TransactionTable.tsx`)** : Un composant générique est utilisé pour afficher les listes de transactions, d'allocations, etc., garantissant une présentation cohérente.
-   **Calcul des Soldes** : La logique de calcul du solde net est standardisée : `Solde Net = Fonds Reçus - (Dépenses + Fonds Réalloués)`. Ces calculs sont effectués dans les hooks ou les services en se basant sur les données récupérées de Supabase.
-   **Communication Backend** : Les services (`transactionService`, `allocationService`) communiquent avec les tables Supabase (`transactions`, `allocations`) pour toutes les opérations CRUD. Les politiques de sécurité (RLS) en base de données garantissent que chaque rôle ne peut voir et modifier que les données autorisées.
