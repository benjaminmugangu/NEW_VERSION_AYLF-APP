# AYLF Group Tracker

## 1. Objectif du Projet

Le projet **AYLF Group Tracker** est une application web conçue pour le suivi et la gestion des activités de l'organisation AYLF (African Youth Leadership Forum). Elle sert de plateforme centralisée pour les coordinateurs à différents niveaux afin de planifier, suivre et rapporter les activités, gérer les membres, et superviser les finances.

Pour une description détaillée de l'architecture et des fonctionnalités, veuillez consulter la **[documentation technique complète](./docs/README.md)**.

## 2. Getting Started

Suivez ces étapes pour configurer et lancer le projet en environnement de développement.

### Prérequis

-   Node.js (version 20.x ou supérieure)
-   npm (généralement inclus avec Node.js)
-   Un compte Supabase et un projet créé.

### Installation

1.  **Cloner le dépôt**

    ```bash
    git clone <URL_DU_DEPOT>
    cd aylf-group-tracker-main
    ```

2.  **Configurer les variables d'environnement**

    Créez un fichier `.env.local` à la racine du projet en copiant le modèle `.env.local.example`.

    ```bash
    cp .env.local.example .env.local
    ```

    Remplissez ensuite le fichier `.env.local` avec vos clés d'API Supabase, que vous trouverez dans les paramètres de votre projet Supabase (`Project Settings > API`):

    ```env
    NEXT_PUBLIC_SUPABASE_URL="VOTRE_URL_SUPABASE"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="VOTRE_CLE_ANON_PUBLIQUE"
    SUPABASE_SERVICE_ROLE_KEY="VOTRE_CLE_SERVICE_ROLE"
    ```

3.  **Installer les dépendances**

    ```bash
    npm install
    ```

    **Note pour les utilisateurs Windows :** Si vous rencontrez une erreur liée à la politique d'exécution de PowerShell, exécutez la commande suivante dans votre terminal et réessayez :
    ```powershell
    Set-ExecutionPolicy RemoteSigned -Scope Process
    ```

### Lancer le serveur de développement

Une fois l'installation terminée, lancez le serveur de développement :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir l'application.

## 3. Comment Contribuer

Nous encourageons les contributions pour améliorer ce projet. Avant de commencer, veuillez prendre connaissance des documents suivants :

1.  **[Structure du Projet](./docs/02-structure-du-projet.md)** : Pour comprendre l'organisation du code.
2.  **[Standards de Codage](./docs/04-recommandations.md)** : Pour connaître les règles de codage, de gestion des erreurs et de documentation à respecter.

Le processus de contribution est le suivant :
1.  Créez une nouvelle branche pour votre fonctionnalité ou votre correctif.
2.  Développez votre contribution en respectant les standards du projet.
3.  Assurez-vous que le code est correctement documenté (JSDoc).
4.  Ouvrez une Pull Request en décrivant clairement les changements que vous avez apportés.
