# 3.11. Fonctionnalité : Rapports Financiers (Financials)

Le module "Financials" (`/dashboard/financials`) est une section dédiée à la consultation et à la génération de rapports financiers. Il complète le module "Finances" qui est axé sur la gestion opérationnelle.

## Fichiers Clés

-   **Pages** : `/dashboard/financials`, `/dashboard/financials/reports`
-   **Service** : `src/services/transactionService.ts` (probablement partagé)

## Logique Métier

### 1. Vue d'Ensemble et Synthèse

-   La page principale (`/dashboard/financials/page.tsx`) offre probablement une vue d'ensemble des états financiers, avec des agrégats et des visualisations (graphiques, tableaux récapitulatifs).
-   Contrairement au module "Finances" qui permet de créer des transactions, ce module est probablement en lecture seule, axé sur la présentation des données.

### 2. Génération de Rapports

-   La présence d'un sous-dossier `reports` indique une fonctionnalité permettant de générer des rapports financiers spécifiques (ex: rapport de dépenses mensuel, état des allocations, etc.).
-   Ces rapports pourraient être filtrables par période, par type de transaction ou par entité (site, petit groupe).

### 3. Distinction avec le Module "Finances"

-   **Module `Finances`** : Centre opérationnel. Permet de créer, modifier et gérer les transactions et les allocations au quotidien.
-   **Module `Financials`** : Centre de reporting. Permet de visualiser, d'analyser et d'exporter des données financières agrégées pour la prise de décision et la comptabilité.

Je ne comprend pas trop la difference entre ces deux modules, tu vas devoir m'espliquer en details la nuance et la raison de leurs existances 
