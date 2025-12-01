# 6. Plongée dans Supabase

Supabase n'est pas seulement une base de données ; c'est une suite d'outils qui constituent le cœur de notre backend. Cette section détaille les concepts clés que nous utilisons pour garantir la sécurité, la performance et la scalabilité.

## 1. Row-Level Security (RLS) : Le Pilier de la Sécurité

La sécurité des données est principalement assurée par les politiques de Sécurité au Niveau des Lignes (RLS) de PostgreSQL, que Supabase expose de manière très accessible.

-   **Le Principe** : Au lieu de gérer les permissions dans le code de l'application (ce qui est sujet à des erreurs), nous définissons des règles directement sur les tables de la base de données. Chaque fois qu'un utilisateur tente de lire ou de modifier une donnée, la base de données vérifie si une politique RLS autorise cette action.

-   **Le "Pourquoi" Stratégique** : Cette approche est extrêmement robuste. Même si un bug dans le code de l'application tentait d'accéder à des données non autorisées, la base de données elle-même bloquerait la requête. La logique de sécurité est centralisée en un seul endroit (le schéma SQL), la rendant plus facile à auditer et à maintenir.

-   **Exemple Conceptuel** : Une politique sur la table `activities` pourrait stipuler :
    -   Un utilisateur peut voir une activité (`SELECT`) uniquement s'il est le créateur de l'activité OU s'il est un coordinateur national.
    -   Un utilisateur peut mettre à jour une activité (`UPDATE`) uniquement s'il en est le créateur.

    ```sql
    -- Politique pour autoriser la lecture
    CREATE POLICY "Users can view their own activities or if they are national coordinators"
    ON activities FOR SELECT
    USING (
      auth.uid() = creator_id OR
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'national_coordinator'
    );
    ```

## 2. Fonctions PostgreSQL (RPC) : La Logique Métier au plus près des Données

Pour les opérations qui vont au-delà du simple CRUD, nous utilisons des fonctions PostgreSQL, appelées via RPC (Remote Procedure Call).

-   **Le Principe** : Au lieu de faire plusieurs allers-retours entre l'application et la base de données pour collecter et agréger des données, nous écrivons une fonction SQL qui exécute toute la logique complexe directement sur le serveur de base de données et ne retourne que le résultat final.

-   **Le "Pourquoi" Stratégique** :
    1.  **Performance** : L'exécution de jointures et d'agrégations complexes est infiniment plus rapide dans la base de données que dans le code applicatif.
    2.  **Atomicité** : Une fonction RPC peut exécuter plusieurs opérations de manière transactionnelle. Si une étape échoue, l'ensemble est annulé.
    3.  **Abstraction** : Elle expose un endpoint simple pour une logique complexe, masquant les détails de l'implémentation du schéma de la base de données.

-   **Exemple Concret** : La fonction `get_sites_with_details_for_user(p_user_id UUID)` est utilisée pour le tableau de bord. En un seul appel, elle retourne la liste des sites auxquels un utilisateur a accès, enrichie de données agrégées comme le nombre de petits groupes et le nombre total de membres pour chaque site. Sans RPC, cela nécessiterait de multiples requêtes coûteuses.

## 3. Gestion du Cache

Supabase intègre un cache au niveau de son API (via PostgREST) pour accélérer les requêtes répétitives. Cependant, pour une expérience utilisateur optimale et un contrôle plus fin, nous ajoutons une couche de mise en cache côté client.

-   **Le Rôle de TanStack Query (React Query)** : Comme mentionné dans le document sur les dépendances, TanStack Query est notre principal outil de gestion du cache côté client. Il met en cache les résultats des requêtes Supabase, évite les appels réseau redondants pour les données fraîches, et rafraîchit les données en arrière-plan pour que l'interface utilisateur soit toujours à jour.

-   **Stratégie Combinée** : Nous bénéficions du meilleur des deux mondes : le cache de Supabase pour les performances brutes de l'API, et le cache de TanStack Query pour une gestion intelligente de l'état du serveur dans l'interface utilisateur.
