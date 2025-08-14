# 3.8. Fonctionnalité : Gestion des Membres

Le module "Membres" (`/dashboard/members`) offre une vue axée sur la consultation des participants de l'organisation. Il se distingue du module "Utilisateurs" (`/dashboard/users`) qui est davantage orienté vers l'administration des comptes et des permissions.

## Fichiers Clés

-   **Pages** : `/dashboard/members`, `/dashboard/members/[memberId]`
-   **Service** : `src/services/userService.ts` (partagé avec la gestion des utilisateurs)
-   **Composants** : `MembersDataTable.tsx`, `MemberProfileCard.tsx` (supposés)

## Logique Métier

### 1. Consultation et Annuaire

-   La fonction principale de ce module est de servir d'annuaire pour l'organisation. Il permet de parcourir la liste des membres, de consulter leurs profils et de voir leur affiliation.
-   L'interface présente probablement une liste ou une grille de membres avec des fonctionnalités de recherche et de filtrage (par site, par petit groupe, par nom).

### 2. Vue de Profil

-   Une page de détail (`/dashboard/members/[memberId]`) affiche le profil public d'un membre, qui pourrait inclure :
    -   Ses informations de base (nom, photo).
    -   Son site et son petit groupe d'appartenance.
    -   La liste des activités auxquelles il a participé.
    -   Les certificats qu'il a obtenus.

### 3. Distinction avec le Module "Utilisateurs"

-   **Module `Utilisateurs`** : Vue administrative. Axé sur le CRUD des comptes, la gestion des rôles et des permissions. Destiné aux administrateurs.
-   **Module `Membres`** : Vue consultative. Axé sur la découverte et la visualisation des profils. Destiné à un public plus large au sein de l'organisation pour favoriser la connexion et la visibilité.

### 4. Permissions

-   La visibilité des profils est gérée par les politiques RLS. Un utilisateur ne peut voir que les membres qui sont dans son périmètre de visibilité (par exemple, un coordinateur de site voit tous les membres de son site, tandis qu'un membre standard ne voit peut-être que les membres de son propre petit groupe).
