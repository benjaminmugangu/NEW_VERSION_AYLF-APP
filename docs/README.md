# Documentation Technique - AYLF Group Tracker

Bienvenue dans la documentation technique du projet AYLF Group Tracker. Ce document sert de point d'entrée pour comprendre l'architecture, la philosophie, les conventions et la logique métier de l'application.

## Table des Matières

### I. Fondamentaux du Projet

1.  **[Introduction](./01-introduction.md)**
    -   Découvrez l'objectif du projet, son architecture générale et les technologies clés utilisées.

2.  **[Structure du Projet](./02-structure-du-projet.md)**
    -   Explorez l'organisation des dossiers et le rôle de chaque composant, de l'interface utilisateur aux services de données.

3.  **[Standards de Codage](./04-recommandations.md)**
    -   Consultez les règles et bonnes pratiques obligatoires pour toute contribution au projet, couvrant la gestion des erreurs, la validation et la documentation.

### II. Architecture Technique Détaillée

4.  **[Communication et API](./03-communication-api.md)**
    -   Comprenez comment le frontend communique avec le backend, le "pourquoi" des choix techniques (mappers, `getUser`) et consultez des exemples de code concrets.

5.  **[Vue d'ensemble des Dépendances](./05-dependances.md)**
    -   Découvrez le rôle de chaque dépendance majeure (Next.js, Supabase, Zod, etc.) et comment elles s'intègrent dans le projet.

6.  **[Plongée dans Supabase](./06-supabase-deep-dive.md)**
    -   Approfondissez les concepts clés de Supabase utilisés dans le projet, notamment la Sécurité au Niveau des Lignes (RLS), les fonctions RPC et la gestion du cache.

### III. Feuille de Route

7.  **[Limitations et Améliorations Futures](./07-limitations-et-ameliorations.md)**
    -   Consultez une liste transparente des faiblesses actuelles et une feuille de route pour les développements futurs.

    ---

## Architecture de Communication

L'application utilise une architecture de communication robuste et sécurisée :

1.  **API REST et RPC de Supabase :** Pour les opérations de base et les requêtes complexes, en s'appuyant sur la Row-Level Security (RLS) pour la sécurité.
2.  **API Routes Internes (Next.js) :** Pour les actions privilégiées nécessitant des clés d'administration (ex: inviter un utilisateur).
3.  **Stratégie de Chargement Hybride :** Pour garantir la fiabilité de l'affichage, les données critiques sont d'abord demandées via le client. En cas d'échec, une route API interne côté serveur prend le relais en utilisant des droits élevés pour récupérer les données, assurant ainsi que l'interface ne soit jamais bloquée.

Pour plus de détails, consultez la [documentation sur la communication et l'API](./docs/03-communication-api.md).
