# 3.7. Fonctionnalité : Gestion des Certificats

Le module de certificats est conçu pour gérer la génération et le suivi des certificats de participation ou d'accomplissement pour les membres, probablement à l'issue de programmes ou d'activités spécifiques.

## Fichiers Clés

-   **Pages** : `/dashboard/certificates`
-   **Service** : `src/services/certificateService.ts` (supposé)
-   **Fonction RPC** : `get_certificate_roster` (identifiée dans les migrations SQL)

## Logique Métier

### 1. Génération de Listes (Roster)

-   La fonctionnalité principale semble être la capacité de générer une "liste de certification" (roster).
-   La fonction PostgreSQL `get_certificate_roster(p_activity_id UUID)` suggère que le processus est lié à une activité spécifique. Elle récupère probablement la liste des participants à une activité donnée qui sont éligibles pour recevoir un certificat.
-   Cette liste pourrait contenir des informations essentielles comme le nom complet du participant, son e-mail, et peut-être son niveau de participation.

### 2. Interface Utilisateur

-   La page `/dashboard/certificates` permet probablement aux coordinateurs de sélectionner une activité et de visualiser ou d'exporter la liste des participants à certifier.
-   L'interface pourrait offrir des fonctionnalités pour :
    -   Filtrer les activités éligibles à la certification.
    -   Prévisualiser la liste des participants.
    -   Exporter les données (par exemple au format CSV) pour une utilisation externe (impression des certificats, envoi par e-mail).

### 3. Rôle et Permissions

-   La capacité de générer ces listes est probablement réservée à des rôles de coordinateurs (National ou Site) qui supervisent les activités.
-   Les politiques de sécurité (RLS) s'assureraient qu'un coordinateur de site ne peut générer des listes que pour les activités de son propre site.
