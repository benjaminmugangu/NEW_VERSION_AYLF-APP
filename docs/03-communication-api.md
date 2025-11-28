# 3. Communication et API

La communication entre le frontend Next.js et le backend Supabase est un élément central de l'architecture de l'application. Elle repose sur trois mécanismes principaux.

## 1. API REST de Supabase et RPC

-   **API REST :** Pour les opérations CRUD simples, le client `supabase-js` est utilisé. La sécurité est garantie par le JWT de l'utilisateur et les politiques RLS (Row-Level Security) de la base de données.
-   **Fonctions RPC :** Pour les requêtes complexes (jointures, agrégations), des fonctions PostgreSQL sont exposées via RPC. Elles centralisent la logique métier et améliorent les performances.

## 2. API Routes Internes de Next.js (`src/app/api`)

Ces routes sont utilisées pour des cas d'usage spécifiques où une logique côté serveur est nécessaire avant d'interagir avec Supabase, notamment pour des actions privilégiées.

-   **Exemple :** `POST /api/users/invite`
    -   Cette route utilise la `service_role_key` de Supabase dans un environnement sécurisé (le serveur Next.js) pour créer un nouvel utilisateur, une action qui ne peut pas être exposée côté client.

## 3. Stratégie de Chargement Hybride (Client-Side avec Fallback Serveur)

Pour garantir une expérience utilisateur robuste, notamment face à des politiques RLS complexes ou des problèmes de timing du chargement des données, une stratégie de chargement hybride a été mise en place.

-   **Principe :** Le frontend tente d'abord de charger les données via le client Supabase standard (RPC ou `select`). Si cette tentative échoue ou renvoie un résultat vide, il bascule automatiquement sur un appel à une route API interne sécurisée.
-   **Exemple Concret :** Le formulaire de création d'utilisateur ([UserForm.tsx](cci:7://file:///c:/Users/Guelo/Downloads/AYLF_APP/aylf-group-tracker-main/src/app/dashboard/users/components/UserForm.tsx:0:0-0:0)) a besoin de la liste des sites. Le service [siteService.ts](cci:7://file:///c:/Users/Guelo/Downloads/AYLF_APP/aylf-group-tracker-main/src/services/siteService.ts:0:0-0:0) tente d'abord de les récupérer via une RPC. Si cela échoue, il appelle l'endpoint `GET /api/sites/list`.

### Endpoints de Service Internes

Ces routes API ne sont pas destinées à une consommation publique mais servent de mécanisme de fallback sécurisé. Elles nécessitent une session utilisateur authentifiée.

-   **`GET /api/sites/list`**
    -   **Description :** Récupère la liste des sites autorisés pour l'utilisateur connecté.
    -   **Logique de Sécurité :** Utilise la `SUPABASE_SERVICE_ROLE_KEY` côté serveur pour contourner les RLS du client, puis applique manuellement les règles de filtrage en fonction du rôle de l'utilisateur.

-   **`GET /api/small-groups/by-site`**
    -   **Description :** Récupère les petits groupes pour un `site_id` donné.
    -   **Logique de Sécurité :** Similaire à `/api/sites/list`, elle utilise la clé de service pour garantir l'accès aux données.

## 4. Évolutions Récentes et Bonnes Pratiques

-   **Types Générés par Supabase :** L'utilisation des types (`Tables`, `TablesInsert`, `TablesUpdate`) générés par Supabase est devenue une pratique standard pour garantir la sécurité de type entre le frontend et le backend.
-   **Validation avec Zod :** Zod est utilisé systématiquement, que ce soit dans les formulaires frontend ou dans les routes API backend, pour valider les données entrantes et garantir leur intégrité.
-   **Rôle Central des Mappers :** Les fonctions de mappage (`mapDb...To...`) servent de couche anti-corruption, découplant le schéma de la base de données des modèles de l'application pour une meilleure maintenabilité.