# 7. Limitations Connues et Améliorations Futures

Ce document a pour but de fournir une vue transparente des faiblesses actuelles du projet et de proposer une feuille de route pour les améliorations futures. L'objectif est de guider les efforts de développement vers les domaines qui auront le plus d'impact.

## 1. Limitations Actuelles

-   **Gestion des Fichiers (Rapports, Photos)** : Le stockage de fichiers (par exemple, les photos pour les rapports d'activité) n'est pas encore implémenté. Bien que Supabase Storage soit la solution désignée, l'intégration côté client et la logique de service associée sont manquantes.

-   **Tests Automatisés** : Le projet manque cruellement de tests automatisés. Il n'y a actuellement ni tests unitaires pour les services et la logique métier, ni tests d'intégration pour les flux d'API, ni tests de bout en bout (E2E) pour les parcours utilisateur critiques. Cela rend les régressions difficiles à détecter.

-   **Gestion Fine des Rôles et Permissions** : Bien que les rôles principaux soient définis, la logique pour gérer des permissions plus granulaires (par exemple, un coordinateur de site ne peut voir que les données de son propre site) repose entièrement sur les politiques RLS. Il pourrait être bénéfique d'avoir une couche d'abstraction dans l'application pour gérer cela plus facilement.

-   **Dépendance à l'Environnement Windows de l'Utilisateur** : L'installation de nouvelles dépendances `npm` est actuellement bloquée par la politique d'exécution PowerShell de l'environnement de développement principal. Cela représente un risque et limite la capacité à intégrer de nouveaux outils.

## 2. Améliorations Futures Proposées

-   **Mettre en Place une Stratégie de Test Robuste** :
    -   **Priorité Haute** : Intégrer `Vitest` ou `Jest` pour les tests unitaires des services, des mappers et des fonctions utilitaires.
    -   **Priorité Moyenne** : Écrire des tests d'intégration pour les routes API afin de valider les schémas Zod et les réponses.
    -   **Priorité Basse** : Mettre en place `Playwright` ou `Cypress` pour des tests E2E sur les flux critiques (authentification, création d'activité).

-   **Intégrer Supabase Storage** :
    -   Développer les services et les hooks nécessaires pour uploader, télécharger et lier des fichiers aux enregistrements de la base de données (ex: rapports).

-   **Refactoriser la Gestion des Erreurs Côté Client** :
    -   Remplacer les `alert()` et `console.log` par un système de notifications unifié (par exemple, en utilisant une bibliothèque comme `sonner` si la restriction sur les dépendances est levée) pour fournir un retour utilisateur plus propre et cohérent.

-   **Développer un Module d'Administration** :
    -   Créer une interface dédiée aux coordinateurs nationaux pour gérer les utilisateurs, les rôles et les permissions directement depuis l'application, sans avoir à passer par l'interface de Supabase.

-   **Optimisation des Performances** :
    -   Analyser les requêtes lentes et optimiser les fonctions RPC et les index de la base de données.
    -   Mettre en place la pagination pour toutes les listes de données volumineuses (activités, utilisateurs, etc.) afin d'améliorer les temps de chargement initiaux.
