# 3.9. Fonctionnalité : Paramètres du Compte

La section "Paramètres" (`/dashboard/settings`) est l'espace personnel où l'utilisateur connecté peut gérer les informations de son propre compte.

## Fichiers Clés

-   **Pages** : `/dashboard/settings`
-   **Service** : `src/services/userService.ts`
-   **Composants** : `ProfileForm.tsx`, `PasswordChangeForm.tsx` (supposés)

## Logique Métier

### 1. Gestion du Profil

-   La fonctionnalité principale de cette page est de permettre à l'utilisateur de mettre à jour ses informations personnelles, telles que :
    -   Son nom et son prénom.
    -   Sa photo de profil.
    -   Ses informations de contact (numéro de téléphone, etc.).
-   Un formulaire (`ProfileForm.tsx`) est probablement utilisé pour soumettre ces modifications. Le service `userService.ts` est ensuite appelé pour mettre à jour l'enregistrement de l'utilisateur dans la table `profiles` ou les métadonnées de l'utilisateur dans `auth.users`.

### 2. Changement de Mot de Passe

-   Une fonctionnalité de sécurité standard et essentielle présente dans cette section est la possibilité pour l'utilisateur de changer son mot de passe.
-   Ce processus implique généralement un formulaire où l'utilisateur doit entrer son ancien mot de passe et son nouveau mot de passe (avec confirmation).
-   Le service `authService.ts` est utilisé pour communiquer avec Supabase et effectuer la mise à jour sécurisée du mot de passe.

### 3. Autres Paramètres

-   Selon l'évolution de l'application, cette page pourrait également inclure d'autres options, comme la gestion des préférences de notification ou le choix de la langue de l'interface.
