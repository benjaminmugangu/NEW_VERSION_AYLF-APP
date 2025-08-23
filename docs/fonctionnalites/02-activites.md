# 3.2. Fonctionnalité : Gestion des Activités

La gestion des activités est une fonctionnalité centrale de l'application, permettant aux utilisateurs de planifier, suivre et rapporter les événements organisés.

## Fichiers Clés

-   **Service** : `src/services/activityService.ts`
-   **Hook** : `src/hooks/useActivities.ts`
-   **Pages** : `/dashboard/activities`, `/dashboard/activities/new`, `/dashboard/activities/[activityId]`
-   **Composants** : `ActivityForm.tsx`, `ActivitiesDataTable.tsx`
-   **Types** : `Activity`, `ActivityFormData` dans `src/lib/types.ts`

## Logique Métier

### 1. Création et Édition (CRUD)

-   **Formulaire** : Le composant `ActivityForm.tsx` est utilisé à la fois pour la création et la modification d'activités. Il utilise `react-hook-form` pour gérer l'état du formulaire et `Zod` pour la validation des données saisies.
-   **Niveaux d'accès** : Le formulaire de création est dynamique. Par exemple, le champ "Niveau" (national, site, petit groupe) est filtré en fonction du rôle de l'utilisateur connecté pour l'empêcher de créer une activité à un niveau pour lequel il n'a pas les autorisations.
-   **Service (`activityService.ts`)** : Ce service gère toutes les interactions avec la table `activities` de Supabase.
    -   Les fonctions `createActivity` et `updateActivity` prennent les données du formulaire, les transforment au format `snake_case` attendu par la base de données, et effectuent l'opération correspondante.
    -   La suppression (`deleteActivity`) est une suppression définitive (hard delete) de l'enregistrement en base de données.

### 2. Affichage et Filtrage

-   **Liste des activités (`/dashboard/activities`)** : La page principale affiche une table de toutes les activités (`ActivitiesDataTable.tsx`).
-   **Hook `useActivities`** : Ce hook utilise `TanStack Query` pour récupérer les activités via la fonction `getFilteredActivities` du service. Il gère le chargement, les erreurs et la mise en cache des données.
-   **Filtrage par rôle** : La fonction `getFilteredActivities` est conçue pour ne retourner que les activités pertinentes pour l'utilisateur connecté, en se basant sur son rôle et son affiliation (site ou petit groupe). Cette logique de filtrage est appliquée côté backend par les politiques de sécurité (RLS) de Supabase.

### 3. Gestion des Statuts

Le statut d'une activité suit un cycle de vie précis, géré en partie manuellement et en partie automatiquement :

-   **`Planned`** : Statut par défaut à la création de l'activité.
-   **`In Progress`** : Peut être défini manuellement par un coordinateur.
-   **`Executed`** : Le statut passe automatiquement à `Executed` lorsqu'un rapport d'activité valide est soumis et approuvé.
-   **`Delayed`** : Si aucun rapport n'est soumis dans un certain délai (ex: 3 jours) après la date d'exécution prévue, un processus (probablement un cron job ou un trigger) pourrait faire passer le statut à `Delayed`.
-   **`Cancelled`** : Statut défini manuellement pour annuler une activité.

L'affichage du statut dans l'interface (ex: avec des badges de couleur) est géré par le composant `Badge.tsx` qui adapte le style en fonction de la valeur du statut.

### 4. Données Enrichies

Lors de la récupération des activités, le service `activityService.ts` utilise des jointures dans la requête Supabase pour enrichir les données. Par exemple, au lieu de ne récupérer que `activity_type_id`, la requête récupère également le nom du type d'activité (`activity_types.name`). Cela évite des requêtes supplémentaires côté client et simplifie l'affichage.
