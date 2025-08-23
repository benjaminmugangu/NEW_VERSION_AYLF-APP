# 3.12. Fonctionnalité : Scripts et Tâches en Arrière-plan

Le projet contient un répertoire `scripts/` destiné à héberger des scripts autonomes pour effectuer des tâches de maintenance, de vérification ou d'automatisation.

## Fichiers Clés

-   **Répertoire** : `scripts/`
-   **Exemple** : `scripts/checkActivities.ts`

## Logique Métier

### 1. Rôle des Scripts

-   Le répertoire `scripts/` est séparé de l'application Next.js principale. Les fichiers qu'il contient sont prévus pour être exécutés manuellement depuis la ligne de commande (ex: `ts-node scripts/checkActivities.ts`) ou par des processus automatisés (cron jobs).
-   Ces scripts interagissent directement avec la base de données Supabase en utilisant les clés d'environnement stockées dans le fichier `.env.local`.

### 2. Exemple : `checkActivities.ts`

-   Le script `checkActivities.ts` est un exemple simple qui se connecte à Supabase et récupère les 5 dernières activités pour les afficher dans la console.
-   **Objectif** : Ce type de script peut servir de base pour des tâches plus complexes, comme :
    -   Vérifier périodiquement le statut des activités et mettre à jour celles qui sont en retard.
    -   Envoyer des e-mails de notification ou de rappel.
    -   Nettoyer des données obsolètes.

### 3. Exécution

-   Pour exécuter ces scripts, un environnement Node.js avec les dépendances du projet (`@supabase/supabase-js`, `dotenv`) et un interpréteur TypeScript (comme `ts-node`) est nécessaire.
-   Ils sont un élément clé pour l'automatisation de la logique métier qui ne peut pas être déclenchée par une action utilisateur directe.
