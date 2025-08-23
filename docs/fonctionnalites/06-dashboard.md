# 3.6. Fonctionnalité : Tableau de Bord Principal

Le tableau de bord principal est la page d'accueil de l'application après la connexion (`/dashboard`). Il offre une vue d'ensemble synthétique et personnalisée de l'état de l'organisation, adaptée au rôle de l'utilisateur connecté.

## Fichiers Clés

-   **Page** : `src/app/dashboard/page.tsx`
-   **Composants** : `StatsCard.tsx`, `RecentActivities.tsx`, `RecentReports.tsx`

## Logique Métier

### 1. Affichage de Statistiques Clés

La fonction première du tableau de bord est de présenter des indicateurs de performance clés (KPIs) sous forme de cartes statistiques (`StatsCard`). Ces statistiques sont agrégées et filtrées en fonction du périmètre de l'utilisateur :

-   **Coordinateur National** : Voit les statistiques pour l'ensemble du pays (nombre total de membres, d'activités, de sites, solde financier national, etc.).
-   **Coordinateur de Site** : Voit les statistiques pour son site uniquement (nombre de membres du site, activités du site, etc.).
-   **Chef de Petit Groupe** : Voit les statistiques pour son petit groupe.

Les données de ces cartes sont récupérées via des hooks qui appellent des fonctions RPC de Supabase, optimisées pour agréger rapidement ces informations.

### 2. Vues Rapides sur les Données Récentes

Le tableau de bord inclut également des sections qui affichent les données les plus récentes pour fournir un contexte immédiat à l'utilisateur :

-   **Activités Récentes** : Une liste des dernières activités planifiées ou exécutées.
-   **Rapports Récents** : Une liste des derniers rapports soumis.
-   **Transactions Récentes** : Un aperçu des dernières transactions financières.

Ces composants réutilisent souvent les mêmes services (`activityService`, `reportService`) que leurs modules respectifs, mais avec des paramètres pour limiter le nombre de résultats retournés.

### 3. Navigation Contextuelle

Le tableau de bord sert de point de départ pour la navigation. Les cartes de statistiques et les listes d'éléments récents sont souvent cliquables, permettant à l'utilisateur de naviguer directement vers la page de détail correspondante pour obtenir plus d'informations.

### 4. Personnalisation par Rôle

Le contenu du tableau de bord est entièrement dynamique et s'adapte au rôle de l'utilisateur. La logique de la page (`page.tsx`) utilise le hook `useAuth` pour récupérer le rôle de l'utilisateur et conditionne l'affichage des composants ou la récupération des données en conséquence. Cela garantit que les informations présentées sont toujours pertinentes et autorisées.
