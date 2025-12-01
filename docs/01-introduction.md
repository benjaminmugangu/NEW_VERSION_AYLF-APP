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

Le projet est structuré comme une **application web moderne** avec une architecture client-serveur claire et découplée :

-   **Frontend (Next.js)** : Le frontend est construit avec Next.js et React. Il gère l'interface utilisateur, la gestion de l'état côté client et la logique de présentation. Il communique avec la couche de services pour toutes les opérations de données.

-   **Couche de Services (`src/services`)** : Il s'agit d'une couche d'abstraction cruciale qui se situe entre le frontend et Supabase. Elle a pour rôle de centraliser et de gérer toute la logique de communication avec la base de données. Chaque service (ex: `activityService.ts`) expose des fonctions claires pour les opérations CRUD et les appels RPC, tout en gérant la transformation des données (mapping) entre le format de la base de données (snake_case) et celui du frontend (camelCase).

-   **API Routes Internes (`src/app/api`)** : Pour les opérations nécessitant des privilèges élevés (comme l'invitation d'un nouvel utilisateur), le projet utilise des API Routes hébergées par Next.js. Celles-ci s'exécutent côté serveur et peuvent utiliser des clés d'administration Supabase en toute sécurité, sans les exposer au client.

-   **Backend (Supabase)** : Supabase sert de backend principal. Il fournit la base de données PostgreSQL, l'authentification, le stockage de fichiers et une API auto-générée. La logique métier complexe et les politiques de sécurité des données sont implémentées directement dans la base de données via des **fonctions PostgreSQL (RPC)** et des **politiques de sécurité au niveau des lignes (RLS)**.

Cette architecture permet de déléguer une grande partie de la complexité du backend à un service managé, tout en gardant un contrôle fin sur la logique métier et la sécurité des données directement dans la base de données.

## 3. Technologies Clés

-   **Framework Frontend** : [Next.js](https://nextjs.org/) (basé sur React)
-   **Langage de Programmation** : [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Base de Données** : [Supabase](https://supabase.com/) (PostgreSQL)
-   **Gestion des Données (Data Fetching)** : [TanStack Query (React Query)](https://tanstack.com/query/latest) pour le data fetching, la mise en cache et la synchronisation de l'état du serveur.
-   **Gestion de l'État Global** : [Zustand](https://zustand-demo.pmnd.rs/) pour la gestion de l'état global léger côté client (ex: session utilisateur).
-   **Gestion des Formulaires** : [React Hook Form](https://react-hook-form.com/) pour la gestion des formulaires et [Zod](https://zod.dev/) pour la validation des schémas.
-   **Styling & UI** :
    -   [Tailwind CSS](https://tailwindcss.com/) pour le style utilitaire.
    -   [shadcn/ui](https://ui.shadcn.com/) pour les composants d'interface utilisateur réutilisables et accessibles.
-   **Linting & Formatage** : ESLint et Prettier pour garantir la qualité et la cohérence du code.
