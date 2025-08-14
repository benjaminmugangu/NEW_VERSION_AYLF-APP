# 3.1. Fonctionnalité : Authentification et Gestion des Utilisateurs

Le module d'authentification est la pierre angulaire de l'application, contrôlant l'accès aux différentes fonctionnalités en fonction des rôles des utilisateurs. Il est entièrement basé sur le service d'authentification de Supabase.

## Fichiers Clés

-   **Service** : `src/services/authService.ts`
-   **Hook** : `src/hooks/useAuth.ts`
-   **Store** : `src/store/useAuthStore.ts`
-   **Pages** : `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`
-   **API Route** : `src/app/api/users/invite/route.ts`

## Logique Métier

### 1. Inscription (Signup)

Le processus d'inscription a une logique particulière pour "amorcer" l'application :

-   **Première Inscription** : La page `/signup` est accessible publiquement **uniquement si la table `auth.users` de Supabase est vide**. Le premier utilisateur qui s'inscrit devient de fait le premier administrateur (probablement un `NATIONAL_COORDINATOR`).
-   **Inscriptions suivantes (par invitation)** : Une fois qu'au moins un utilisateur existe, l'inscription publique via `/signup` est désactivée. Les nouveaux utilisateurs ne peuvent être créés que par un administrateur via un système d'invitation.

### 2. Connexion (Login)

-   Le processus de connexion est standard : l'utilisateur fournit son e-mail et son mot de passe.
-   Le service `authService.ts` communique avec Supabase pour valider les informations d'identification.
-   En cas de succès, Supabase retourne une session (contenant un `access_token` et un `refresh_token`) qui est stockée de manière sécurisée dans le navigateur.

### 3. Gestion de la Session

-   **Store Zustand (`useAuthStore`)** : L'état de la session (informations de l'utilisateur, statut de connexion) est stocké dans un store Zustand. Cela permet à n'importe quel composant de l'application d'accéder facilement à l'état d'authentification.
-   **Hook `useAuth`** : Ce hook fournit une interface simple pour interagir avec le store et les fonctions d'authentification (login, logout, etc.). Il gère également la persistance de la session en synchronisant l'état du store avec les changements d'état d'authentification de Supabase (`onAuthStateChange`).
-   **Persistance** : La session utilisateur est persistante. Même si l'utilisateur ferme l'onglet ou le navigateur, Supabase est capable de restaurer la session lors de la prochaine visite, et le hook `useAuth` met à jour l'état de l'application en conséquence.

### 4. Système d'Invitation

-   **Processus** : Un administrateur (ex: `NATIONAL_COORDINATOR`) peut inviter un nouvel utilisateur via un formulaire dédié (probablement dans `/dashboard/users/new`).
-   **API Endpoint (`/api/users/invite`)** : Le formulaire frontend envoie une requête à cet endpoint interne.
-   **Logique Backend** : La route API utilise les privilèges d'administrateur de Supabase (`supabase.auth.admin`) pour créer un nouvel utilisateur avec un mot de passe temporaire et lui assigner un rôle et d'autres métadonnées (comme le `site_id` ou `small_group_id`).
-   **Flux Utilisateur** : L'utilisateur invité reçoit un e-mail (envoyé par Supabase ou un service tiers comme Resend) contenant un lien pour se connecter et finaliser la création de son compte (généralement en changeant son mot de passe).

### 5. Protection des Routes

L'accès aux pages du tableau de bord (`/dashboard/*`) est protégé. La logique de protection, souvent située dans un composant de layout ou via un middleware, vérifie l'état d'authentification de l'utilisateur. Si l'utilisateur n'est pas connecté, il est redirigé vers la page de connexion (`/login`).
