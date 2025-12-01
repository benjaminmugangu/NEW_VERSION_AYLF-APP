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
│   ├── lib/                # Utilitaires, types, constantes et mappers.
│   ├── services/           # Logique de communication avec le backend (Supabase).
│   ├── store/              # Gestion de l'état global avec Zustand.
│   └── utils/              # Fonctions utilitaires (client Supabase, etc.).
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
-   `constants.ts`: Constantes partagées (ex: rôles des utilisateurs).
-   `mappers.ts`: Contient les fonctions de mappage qui convertissent les objets de la base de données (snake_case) en objets typés pour le frontend (camelCase) et vice-versa. C'est une pièce maîtresse pour garantir la cohérence des types.
-   `types.ts`: Définitions des types et interfaces TypeScript (`Site`, `Member`, `Activity`, etc.) qui définissent les contrats de données de l'application.
-   `utils.ts`: Fonctions utilitaires générales.

### `src/utils/supabase`
Ce dossier contient la configuration du client Supabase. Il est crucial car il gère l'initialisation du client de manière isomorphique, c'est-à-dire qu'il peut être utilisé aussi bien côté serveur (dans les API Routes) que côté client (dans les composants React).
-   `client.ts`: Exporte une instance du client Supabase pour le navigateur.
-   `server.ts`: Exporte une instance du client Supabase pour le serveur.

### `src/services`

La couche de service est un élément central de l'architecture. Elle agit comme un médiateur entre le frontend et Supabase, encapsulant toute la logique de communication avec la base de données.

**Rôles et responsabilités :**

1.  **Abstraction de la source de données** : Les composants et les hooks n'interagissent jamais directement avec Supabase. Ils appellent les fonctions de service (ex: `siteService.getSiteById(id)`), ce qui rend le code plus modulaire et plus facile à tester.

2.  **Gestion des opérations de données** : Chaque service regroupe les fonctions liées à une entité métier (ex: `activityService.ts`, `memberService.ts`). Il gère les opérations CRUD via l'API REST de Supabase et les requêtes complexes via les fonctions RPC.

3.  **Transformation des données (Mapping)** : Les services sont responsables de la conversion systématique des données entre le format de la base de données (snake_case) et le format du frontend (camelCase), en utilisant les fonctions du répertoire `lib/mappers.ts`. Cela garantit que le reste de l'application manipule des objets typés et cohérents.

4.  **Gestion des erreurs centralisée** : Conformément aux standards du projet, tous les services doivent `throw new Error()` en cas d'échec d'une opération. La gestion des erreurs (avec des blocs `try/catch`) est ainsi déléguée à la couche appelante (généralement les hooks), ce qui clarifie le flux de contrôle.

### `src/store`
Contient les stores Zustand pour la gestion de l'état global. Par exemple, `useAuthStore.ts` gère l'état de la session de l'utilisateur (connecté ou non, informations de l'utilisateur).

### `supabase`
Ce dossier contient tout ce qui est lié à la base de données Supabase.
-   **`migrations`** : Le dossier le plus important. Il contient les scripts SQL qui décrivent l'évolution du schéma de la base de données. Chaque fichier représente une migration qui ajoute ou modifie des tables, des colonnes, des fonctions (RPC), ou des politiques de sécurité (RLS).
