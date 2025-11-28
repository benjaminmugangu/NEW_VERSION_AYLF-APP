# 5. Vue d'ensemble des Dépendances Clés

Ce document décrit le rôle de chaque dépendance majeure dans le projet et comment elles s'intègrent pour construire l'application.

## 1. Framework Principal

-   **[Next.js](https://nextjs.org/) (React)**
    -   **Rôle** : C'est le framework sur lequel toute l'application est construite. Il fournit le routage basé sur le système de fichiers, le rendu côté serveur (SSR), la génération de sites statiques (SSG), et les API Routes, ce qui en fait une solution tout-en-un pour le frontend et le backend léger.
    -   **Intégration** : Le projet utilise l'App Router de Next.js pour structurer les pages et les API. Les Server Components sont utilisés pour un accès sécurisé aux données.

## 2. Langage et Typage

-   **[TypeScript](https://www.typescriptlang.org/)**
    -   **Rôle** : TypeScript ajoute un typage statique au JavaScript, ce qui permet de détecter de nombreuses erreurs au moment de la compilation plutôt qu'à l'exécution.
    -   **Intégration** : L'ensemble du projet est écrit en TypeScript. Nous nous appuyons fortement sur les types générés par Supabase et nos propres types de domaine (`lib/types.ts`) pour garantir la sécurité des types à travers toute l'application.

## 3. Backend et Données

-   **[Supabase](https://supabase.com/)**
    -   **Rôle** : Supabase est notre backend "as a service". Il fournit la base de données PostgreSQL, l'authentification, le stockage de fichiers, et une API auto-générée.
    -   **Intégration** : Nous utilisons `supabase-js` pour interagir avec l'API REST et les fonctions RPC depuis notre couche de services. La sécurité est gérée par les politiques RLS.

-   **[TanStack Query (React Query)](https://tanstack.com/query/latest)**
    -   **Rôle** : C'est un outil puissant pour la gestion de l'état du serveur. Il simplifie la récupération, la mise en cache, la synchronisation et la mise à jour des données provenant de Supabase.
    -   **Intégration** : Les hooks personnalisés (ex: `useActivities`) utilisent `useQuery` pour récupérer les données via les services, gérant automatiquement le chargement, les erreurs et la mise en cache pour améliorer l'expérience utilisateur.

## 4. Gestion de l'État et des Formulaires

-   **[Zustand](https://zustand-demo.pmnd.rs/)**
    -   **Rôle** : Une bibliothèque de gestion d'état global minimaliste. Elle est utilisée pour les états qui doivent être partagés entre des composants non liés, comme l'état de la session de l'utilisateur.
    -   **Intégration** : `useAuthStore` est un exemple de store Zustand qui conserve les informations de l'utilisateur connecté.

-   **[React Hook Form](https://react-hook-form.com/)**
    -   **Rôle** : Gère les formulaires de manière performante en minimisant les re-renderings. Il s'intègre parfaitement avec les bibliothèques de validation.
    -   **Intégration** : Utilisé dans tous les formulaires de l'application (création d'activité, connexion, etc.) pour gérer les entrées, la validation et la soumission.

-   **[Zod](https://zod.dev/)**
    -   **Rôle** : Une bibliothèque de déclaration et de validation de schémas basée sur TypeScript. Elle est utilisée pour valider les données des formulaires côté client et les corps des requêtes côté serveur.
    -   **Intégration** : Chaque formulaire a un schéma Zod associé. React Hook Form l'utilise pour la validation en temps réel. Les API Routes l'utilisent pour sécuriser les endpoints.

## 5. Interface Utilisateur et Style

-   **[Tailwind CSS](https://tailwindcss.com/)**
    -   **Rôle** : Un framework CSS "utility-first" qui permet de construire rapidement des designs personnalisés directement dans le HTML.
    -   **Intégration** : C'est la base de tout le style du projet.

-   **[shadcn/ui](https://ui.shadcn.com/)**
    -   **Rôle** : Ce n'est pas une bibliothèque de composants traditionnelle, mais une collection de composants réutilisables et accessibles (construits avec Tailwind CSS) que l'on peut copier-coller dans le projet et personnaliser.
    -   **Intégration** : Les composants de base comme `Button`, `Card`, `Input`, etc., proviennent de shadcn/ui et sont situés dans `src/components/ui`.
