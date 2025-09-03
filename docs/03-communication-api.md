# 3. Communication et API

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

## 4. Évolutions Récentes et Bonnes Pratiques

Pour améliorer la robustesse et la maintenabilité du code, plusieurs pratiques ont été récemment adoptées :

### Types Générés par Supabase

Pour garantir une sécurité de type maximale lors des interactions avec la base de données, le projet utilise les types TypeScript générés automatiquement par Supabase. Ces types sont cruciaux pour éviter les erreurs de discordance de données entre le frontend et le backend.

-   `Tables<'nom_de_la_table'>` : Représente le type d'un objet lu depuis la base de données.
-   `TablesInsert<'nom_de_la_table'>` : Représente le type d'un objet à insérer (champs `id` ou `created_at` optionnels).
-   `TablesUpdate<'nom_de_la_table'>` : Représente le type d'un objet à mettre à jour (tous les champs sont optionnels).

L'utilisation de ces types est **obligatoire** dans la couche de services pour toutes les opérations CRUD.

-   **Pourquoi ?** L'utilisation des types générés élimine les suppositions et prévient une classe entière de bugs à la compilation plutôt qu'à l'exécution. Si un champ est renommé ou supprimé dans la base de données, le code TypeScript qui y fait référence ne compilera plus, nous alertant immédiatement du changement nécessaire.

-   **Exemple Concret** : Utilisation dans un service pour typer une nouvelle activité.
    ```typescript
    import { supabase } from '@/utils/supabase/client';
    import { TablesInsert } from '@/types/supabase';

    export const createActivity = async (activityData: TablesInsert<'activities'>) => {
      const { data, error } = await supabase
        .from('activities')
        .insert(activityData)
        .select();

      if (error) throw new Error(error.message);
      return data[0];
    };
    ```

### Migration de `getSession()` vers `getUser()`

La méthode `getSession()` côté client a été progressivement remplacée par `getUser()` côté serveur (dans les Server Components, API Routes, etc.).

-   **Le "Pourquoi" Stratégique** : Le principal moteur de cette migration est la **sécurité et la fiabilité**. La méthode `getSession()` côté client se fie au JWT stocké dans le navigateur. Ce token peut devenir désynchronisé (par exemple, si les permissions de l'utilisateur ont été modifiées côté serveur) ou expirer. En utilisant `getUser()` côté serveur, chaque requête protégée est validée directement auprès de Supabase, garantissant que les droits d'accès sont toujours vérifiés par la source de vérité. Cela prévient les accès non autorisés et assure que les politiques RLS sont appliquées sur la base de l'état de session le plus récent, et non sur un cache potentiellement obsolète côté client.

### Rôle Central des Mappers de Données

Comme mentionné dans la section sur la structure du projet, les fonctions de mappage (ex: `mapRowToActivity`, `mapDbSiteToSite`) jouent un rôle essentiel.

-   **Le "Pourquoi" Stratégique** : Les mappers servent de **couche anti-corruption** entre la base de données et l'application frontend. Ils découplent le schéma de la base de données (la source de données) des modèles de domaine du frontend (`lib/types.ts`). Ce découplage est crucial car il permet à l'un de changer sans forcément casser l'autre. Par exemple, si nous décidons de renommer un champ dans la base de données, nous n'aurons qu'à mettre à jour le mapper correspondant, sans que ce changement ne se propage dans tous les composants de l'application. Cela centralise la logique de transformation des données, la rendant plus facile à maintenir et à tester.

-   **Exemple Concret** : Mapper une ligne de la table `sites` vers notre type `Site`.

    ```typescript
    // Dans src/lib/mappers.ts
    import { Site } from './types';
    import { Tables } from '@/types/supabase';

    export const mapDbSiteToSite = (row: Tables<'sites'>): Site => {
      return {
        id: row.id,
        name: row.name,
        city: row.city,
        country: row.country,
        // Gère les cas où la date de création peut avoir des noms différents ou être nulle
        creationDate: row.creation_date ?? row.created_at ?? new Date().toISOString(),
        coordinatorId: row.coordinator_id ?? undefined,
      };
    };
    ```
