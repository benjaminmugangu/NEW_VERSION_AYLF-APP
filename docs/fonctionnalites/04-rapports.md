# 3.4. Fonctionnalité : Gestion des Rapports

Le module de rapports est le mécanisme par lequel les utilisateurs fournissent un compte-rendu détaillé des activités exécutées. La soumission d'un rapport est une étape clé qui influence le statut de l'activité correspondante.

## Fichiers Clés

-   **Service** : `src/services/reportService.ts`
-   **Hook** : `src/hooks/useReports.ts`
-   **Pages** : `/dashboard/reports/submit`, `/dashboard/reports/view`
-   **Composants** : `ReportForm.tsx`
-   **Types** : `Report`, `ReportFormData` dans `src/lib/types.ts`

## Logique Métier

### 1. Soumission d'un Rapport

-   **Formulaire (`ReportForm.tsx`)** : Un formulaire dédié permet aux utilisateurs de soumettre un rapport pour une activité spécifique. Ce formulaire collecte des informations cruciales telles que :
    -   Un résumé de l'activité.
    -   Le nombre de participants.
    -   Les coûts associés (dépenses).
    -   Des photos ou des preuves de l'événement.
-   **Lien avec l'Activité** : Chaque rapport est directement lié à une activité existante. La soumission d'un rapport pour une activité fait passer le statut de cette dernière à `Executed`.

### 2. Upload d'Images

-   **Supabase Storage** : Le système utilise le service **Supabase Storage** pour gérer l'upload des images des rapports.
-   **Bucket Public** : Les images sont stockées dans un bucket dédié (nommé `report-images`). Ce bucket doit être configuré avec des politiques de sécurité qui autorisent l'upload pour les utilisateurs authentifiés et la lecture publique (`public-read`) pour que les images puissent être affichées facilement dans l'application.
-   **Processus d'Upload** : Le `reportService.ts` contient la logique pour :
    1.  Prendre le fichier image depuis le formulaire.
    2.  Lui donner un nom unique (généralement basé sur un timestamp ou un UUID) pour éviter les conflits.
    3.  L'uploader dans le bucket Supabase Storage.
    4.  Récupérer l'URL publique de l'image uploadée.
    5.  Stocker cette URL dans la colonne `image_url` de la table `reports` en base de données.

### 3. Consultation des Rapports

-   Une page dédiée (`/dashboard/reports/view`) permet de visualiser les rapports soumis.
-   Tout comme pour les autres modules, le service `reportService.ts` et le hook `useReports.ts` travaillent de concert pour récupérer les données des rapports, en les enrichissant avec des informations contextuelles (nom de l'activité, nom du soumissionnaire, etc.) via des jointures SQL.
-   Les politiques de sécurité (RLS) de Supabase garantissent que les utilisateurs ne peuvent consulter que les rapports qui les concernent, en fonction de leur rôle et de leur périmètre (national, site, ou petit groupe).


Cette documentation n'est pas complete car elle ne montre pas comment la soumission des rapoort pour des activites specifiques est restreinte suivant les differetns roles des utilisateurs, il faudra ajoouter cela car n'importe qui n'a pas le doit au CRUD de n'importe quel rapport 
