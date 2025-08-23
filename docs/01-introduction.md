# Introduction au Projet AYLF Group Tracker

## 1. Objectif Principal

Le projet **AYLF Group Tracker** est une application web conçue pour le suivi et la gestion des activités de l'organisation AYLF (African Youth Leadership Forum). Elle sert de plateforme centralisée pour les coordinateurs à différents niveaux (national, site, petits groupes) afin de planifier, suivre et rapporter les activités, gérer les membres, et superviser les finances.

L'objectif est de fournir un outil structuré pour :
- **Planifier** les activités et les assigner.
- **Collecter** les rapports d'activités, y compris les dépenses et les participants.
- **Gérer** la hiérarchie des membres et leur appartenance aux différents groupes.
- **Suivre** les flux financiers (allocations, dépenses).
- **Visualiser** les statistiques clés via un tableau de bord.

## 2. Architecture Générale

Le projet est structuré comme une **application web monolithique** avec une architecture client-serveur claire :

-   **Frontend** : Construit avec **Next.js**, il s'agit d'une Single Page Application (SPA) qui gère toute l'interface utilisateur et la logique côté client. Le rendu est principalement côté client (CSR), avec certaines pages potentiellement rendues côté serveur (SSR) pour des raisons de performance ou de SEO.
-   **Backend** : Le backend est fourni par **Supabase**, une plateforme "Backend as a Service" (BaaS). Supabase gère la base de données (PostgreSQL), l'authentification, le stockage de fichiers (Storage), et fournit une API REST et GraphQL auto-générée. La logique métier côté serveur est implémentée via des **fonctions PostgreSQL (RPC)** et des **politiques de sécurité au niveau des lignes (RLS)**.

Cette architecture permet de déléguer une grande partie de la complexité du backend à un service managé, tout en gardant un contrôle fin sur la logique métier et la sécurité des données directement dans la base de données.

## 3. Technologies Clés

-   **Framework Frontend** : [Next.js](https://nextjs.org/) (basé sur React)
-   **Langage de Programmation** : [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Base de Données** : [Supabase](https://supabase.com/) (PostgreSQL)
-   **Gestion de l'état et des données** :
    -   [TanStack Query (React Query)](https://tanstack.com/query/latest) pour le data fetching, la mise en cache et la synchronisation de l'état du serveur.
    -   [Zustand](https://zustand-demo.pmnd.rs/) pour la gestion de l'état global côté client (ex: session utilisateur).
-   **Gestion des Formulaires** : [React Hook Form](https://react-hook-form.com/) pour la gestion des formulaires et [Zod](https://zod.dev/) pour la validation des schémas.
-   **Styling & UI** :
    -   [Tailwind CSS](https://tailwindcss.com/) pour le style utilitaire.
    -   [shadcn/ui](https://ui.shadcn.com/) pour les composants d'interface utilisateur réutilisables et accessibles.
-   **Linting & Formatage** : ESLint et Prettier pour garantir la qualité et la cohérence du code.
