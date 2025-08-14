# 4. Communication et API

La communication entre le frontend Next.js et le backend Supabase est un élément central de l'architecture de l'application. Elle repose principalement sur deux mécanismes fournis par Supabase : l'API REST et les appels de fonctions PostgreSQL (RPC).

## 1. API REST de Supabase

Par défaut, Supabase expose une API REST complète pour interagir avec la base de données PostgreSQL. Le client JavaScript `supabase-js` est un wrapper autour de cette API, fournissant une interface fluide et typée pour effectuer des opérations CRUD.

### Utilisation

-   **Exemple (lecture)** : `supabase.from('activities').select('*')`
-   **Exemple (écriture)** : `supabase.from('reports').insert({ ... })`

Cette méthode est utilisée pour la majorité des opérations simples de lecture et d'écriture dans les services (ex: `activityService.ts`, `reportService.ts`).

### Sécurité

Chaque requête à l'API REST est authentifiée à l'aide du JSON Web Token (JWT) de l'utilisateur connecté. Les **Politiques de Sécurité au Niveau des Lignes (Row-Level Security - RLS)** définies dans la base de données sont automatiquement appliquées. C'est le mécanisme de sécurité principal qui garantit qu'un utilisateur ne peut accéder qu'aux données qu'il est autorisé à voir.

## 2. Fonctions PostgreSQL (RPC - Remote Procedure Call)

Pour des requêtes plus complexes qui nécessitent des jointures, des agrégations ou une logique métier spécifique, le projet utilise des fonctions PostgreSQL. Ces fonctions sont ensuite exposées comme des endpoints API via le mécanisme RPC de Supabase.

### Avantages

-   **Performance** : Les calculs et les jointures complexes sont effectués directement dans la base de données, ce qui est beaucoup plus performant que de récupérer des données brutes et de les traiter côté client.
-   **Centralisation de la logique** : La logique métier complexe est encapsulée dans des fonctions SQL, ce qui la rend plus facile à maintenir et à réutiliser.

### Exemples de Fonctions RPC dans le Projet

-   `get_sites_with_details()` : Récupère la liste des sites en y ajoutant des informations agrégées comme le nombre de petits groupes et le nombre total de membres.
-   `get_small_groups_with_member_count_by_site(p_site_id UUID)` : Récupère les petits groupes pour un site donné, en incluant le nombre de membres de chaque groupe.
-   `get_activity_participant_count(p_activity_id UUID)` : Calcule et retourne le nombre de participants pour une activité spécifique.

### Utilisation

Le client Supabase permet d'appeler ces fonctions de manière simple :
`supabase.rpc('nom_de_la_fonction', { parametre: valeur })`

## 3. API Routes Internes de Next.js (`src/app/api`)

Le projet utilise également des routes API internes, hébergées par Next.js, pour des cas d'usage spécifiques où une logique côté serveur est nécessaire avant d'interagir avec Supabase.

-   **Exemple** : `src/app/api/users/invite/route.ts`

Cette route est utilisée pour inviter de nouveaux utilisateurs. Le frontend appelle cet endpoint, qui à son tour exécute une logique côté serveur. L'avantage est de pouvoir utiliser les **clés d'administration de Supabase** (`service_role_key`) dans un environnement sécurisé (le serveur Next.js) pour effectuer des actions privilégiées, comme la création d'un utilisateur, sans exposer ces clés au client.

En résumé, la communication est structurée de la manière suivante :
-   **Opérations CRUD simples** -> API REST de Supabase + RLS.
-   **Lectures et calculs complexes** -> Fonctions RPC de Supabase.
-   **Actions nécessitant des privilèges élevés** -> API Routes internes de Next.js.
