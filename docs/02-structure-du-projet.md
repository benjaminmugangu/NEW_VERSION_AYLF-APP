# 2. Structure du Projet

Le projet AYLF Group Tracker est organisé de manière à séparer clairement les différentes préoccupations (logique de l'interface utilisateur, services, types, etc.). Voici une description de l'arborescence des répertoires principaux et de leur rôle.

```
.
├── docs/                   # Documentation technique du projet.
├── public/                 # Fichiers statiques accessibles publiquement (images, polices).
├── src/
│   ├── app/                # Cœur de l'application Next.js (routage, pages, API).
│   │   ├── (auth)/           # Groupe de routes pour l'authentification (login, signup).
│   │   ├── api/              # Endpoints de l'API backend interne.
│   │   └── dashboard/        # Routes et pages protégées du tableau de bord.
│   ├── components/         # Composants React réutilisables.
│   │   └── ui/             # Composants d'interface de base (boutons, cartes, etc.) fournis par shadcn/ui.
│   ├── hooks/              # Hooks React personnalisés pour la logique réutilisable.
│   ├── lib/                # Utilitaires, types et configuration globale.
│   ├── services/           # Logique de communication avec le backend (Supabase).
│   └── store/              # Gestion de l'état global avec Zustand.
└── supabase/               # Configuration et migrations de la base de données Supabase.
    └── migrations/         # Scripts de migration SQL pour le schéma de la base de données.
```

## Description des Dossiers

### `src/app`
Ce répertoire est au cœur du routage de Next.js. Chaque dossier à l'intérieur représente un segment d'URL.
-   **`(auth)`** : Contient les pages publiques liées à l'authentification (`/login`, `/signup`). Le nom entre parenthèses indique que ce n'est pas un segment d'URL, mais un groupe logique.
-   **`api`** : Contient les routes de l'API côté serveur. Ces endpoints sont utilisés par le frontend pour des opérations spécifiques qui nécessitent une exécution côté serveur (ex: inviter un utilisateur).
-   **`dashboard`** : Contient toutes les pages et routes qui ne sont accessibles qu'après authentification. C'est ici que se trouve la logique principale de l'application (gestion des activités, des finances, des membres, etc.).

### `src/components`
Ce dossier contient tous les composants React de l'application.
-   **`ui`** : Composants d'interface utilisateur de base, généralement sans état ou avec une logique minimale, fournis par `shadcn/ui` (ex: `Button.tsx`, `Card.tsx`, `Input.tsx`).
-   Le reste du dossier contient des composants plus complexes et spécifiques au domaine, qui assemblent les composants de base de `ui` pour créer des fonctionnalités (ex: `ActivityForm.tsx`, `UserTable.tsx`).

### `src/hooks`
Contient les hooks React personnalisés qui encapsulent une logique réutilisable. C'est ici que l'on trouve les hooks de `TanStack Query` pour interagir avec les services (ex: `useActivities.ts`, `useAuth.ts`).

### `src/lib`
Ce répertoire est une boîte à outils pour le reste de l'application.
-   `constants.ts` : Constantes partagées (ex: rôles des utilisateurs).
-   `supabaseClient.ts` : Initialisation et exportation du client Supabase.
-   `types.ts` : Définitions des types et interfaces TypeScript utilisés dans tout le projet.
-   `utils.ts` : Fonctions utilitaires générales.

### `src/services`
La couche de service est responsable de toute la communication avec le backend (Supabase). Chaque fichier (ex: `activityService.ts`, `authService.ts`) regroupe les fonctions permettant d'effectuer des opérations CRUD (Create, Read, Update, Delete) sur une ressource spécifique. Ces services sont appelés par les hooks dans le répertoire `hooks/`.

### `src/store`
Contient les stores Zustand pour la gestion de l'état global. Par exemple, `useAuthStore.ts` gère l'état de la session de l'utilisateur (connecté ou non, informations de l'utilisateur).

### `supabase`
Ce dossier contient tout ce qui est lié à la base de données Supabase.
-   **`migrations`** : Le dossier le plus important. Il contient les scripts SQL qui décrivent l'évolution du schéma de la base de données. Chaque fichier représente une migration qui ajoute ou modifie des tables, des colonnes, des fonctions (RPC), ou des politiques de sécurité (RLS).
