# 3.5. Fonctionnalité : Gestion de l'Organisation (Utilisateurs, Sites, Petits Groupes)

Ce bloc fonctionnel couvre la gestion de la structure hiérarchique de l'organisation : les utilisateurs et leur affectation à des sites ou à des petits groupes.

## Fichiers Clés

-   **Services** : `src/services/userService.ts`, `src/services/siteService.ts`, `src/services/smallGroupService.ts`
-   **Hooks** : `src/hooks/useUsers.ts`, `src/hooks/useSites.ts`, `src/hooks/useSmallGroups.ts`
-   **Pages** : `/dashboard/users`, `/dashboard/sites`, `/dashboard/small-groups`
-   **Composants** : `UserForm.tsx`, `SiteForm.tsx`, `SmallGroupForm.tsx`

## Logique Métier

### 1. Gestion des Utilisateurs

-   **Création** : Comme décrit dans le module d'authentification, la création se fait principalement par invitation par un administrateur.
-   **Affichage et Rôles** : La page `/dashboard/users` affiche la liste de tous les utilisateurs. Des filtres permettent de trier par rôle, par site ou par petit groupe.
-   **Modification** : Les administrateurs peuvent modifier les informations d'un utilisateur, notamment son rôle et son affectation à un site ou à un petit groupe. Les menus déroulants pour la sélection du site/petit groupe sont souvent dynamiques et dépendent du contexte de l'administrateur qui effectue l'action.
-   **Dépendances** : La gestion des utilisateurs est étroitement liée à la gestion des sites et des petits groupes. Un utilisateur ne peut être affecté qu'à une entité existante.

### 2. Gestion des Sites

-   **CRUD** : Le module permet aux coordinateurs nationaux de créer, lire, mettre à jour et supprimer des sites.
-   **Vue Détaillée (`/dashboard/sites/[siteId]`)** : La page de détail d'un site est une vue agrégée qui affiche :
    -   Les informations du site lui-même.
    -   La liste des petits groupes rattachés à ce site.
    -   La liste des membres (utilisateurs) de ce site.
    -   Des statistiques clés (nombre de membres, nombre d'activités, etc.).
-   **Logique d'Affichage** : Les données de cette page sont récupérées via des fonctions RPC complexes (ex: `get_sites_with_details`) pour agréger efficacement toutes les informations nécessaires en une seule requête.

### 3. Gestion des Petits Groupes

-   **CRUD** : Les coordinateurs de site peuvent gérer les petits groupes au sein de leur propre site.
-   **Affectation** : Chaque petit groupe est obligatoirement rattaché à un site.
-   **Vue Détaillée** : Comme pour les sites, la page de détail d'un petit groupe affiche ses informations, la liste de ses membres et ses activités spécifiques.

## Sécurité et Permissions

L'ensemble de ce module est fortement contrôlé par les politiques de sécurité (RLS) de Supabase :

-   Un **Coordinateur National** peut voir et gérer tous les utilisateurs, tous les sites et tous les petits groupes.
-   Un **Coordinateur de Site** ne peut voir et gérer que les utilisateurs et les petits groupes appartenant à son site.
-   Un **Chef de Petit Groupe** a une vue encore plus restreinte, limitée aux membres de son propre groupe.
