# 4. Standards de Codage

Pour garantir la qualité, la cohérence et la maintenabilité du projet, tous les contributeurs doivent adhérer de manière stricte et systématique aux règles suivantes. Ces standards ne sont pas des recommandations, mais des exigences.

## 1. Gestion des Erreurs Backend

-   **Règle** : Tous les services (dans `src/services`) doivent impérativement `throw new Error()` en cas d'échec d'une opération avec la base de données. Le pattern `ServiceResponse` (`{ success: boolean, data?: T, error?: ... }`) est proscrit.
-   **Justification** : Cette approche unifie la gestion des erreurs et force la couche appelante (généralement les hooks ou les Server Actions) à gérer explicitement les cas d'erreur avec des blocs `try/catch`. Cela rend le code plus robuste et prévisible.
-   **Exemple** :
    ```typescript
    // Dans un service
    if (error) {
      console.error('Service Error:', error.message);
      throw new Error('Impossible de récupérer les données.');
    }
    
    // Dans un hook ou un composant
    try {
      const data = await activityService.getActivities();
      // ...
    } catch (error) {
      // Afficher une notification à l'utilisateur
    }
    ```

## 2. Validation Stricte des Entrées API

-   **Règle** : Chaque route API (`src/app/api`) qui reçoit des données (via `POST`, `PUT`, `PATCH`, ou `DELETE` avec des paramètres d'URL) doit utiliser un schéma **Zod** pour une validation rigoureuse des entrées.
-   **Justification** : La validation côté serveur est une couche de sécurité essentielle qui protège l'application contre les données malformées ou malveillantes, même si des validations existent déjà côté client.
-   **Implémentation** : En cas d'échec de la validation, la route doit retourner une `NextResponse` avec un statut `400` (Bad Request) et un message d'erreur clair.
-   **Exemple Concret** : Validation dans une route API pour inviter un utilisateur.

    ```typescript
    // Dans src/app/api/users/invite/route.ts
    import { z } from 'zod';
    import { NextResponse } from 'next/server';

    // 1. Définir le schéma de validation
    const inviteUserSchema = z.object({
      email: z.string().email({ message: 'Adresse email invalide.' }),
      role: z.enum(['national_coordinator', 'site_coordinator', 'small_group_leader']),
      site_id: z.string().uuid().optional(), // Optionnel, mais doit être un UUID si présent
    });

    export async function POST(request: Request) {
      try {
        const body = await request.json();
        
        // 2. Valider le corps de la requête
        const validatedData = inviteUserSchema.parse(body);

        // ... logique pour inviter l'utilisateur avec les données validées
        
        return NextResponse.json({ message: 'Invitation envoyée avec succès.' });

      } catch (error) {
        // 3. Gérer les erreurs de validation
        if (error instanceof z.ZodError) {
          return new NextResponse(JSON.stringify({ errors: error.errors }), { status: 400 });
        }

        // Gérer les autres erreurs
        return new NextResponse('Erreur interne du serveur.', { status: 500 });
      }
    }
    ```

## 3. Documentation JSDoc Exhaustive

-   **Règle** : Tous les composants React, hooks personnalisés, services, fonctions utilitaires complexes et types de données doivent être documentés avec **JSDoc**.
-   **Justification** : Une bonne documentation dans le code est cruciale pour la maintenabilité et facilite l'intégration de nouveaux développeurs. Elle permet de comprendre rapidement le rôle de chaque partie du code sans avoir à en lire toute l'implémentation.
-   **Exigences minimales** :
    -   Une description du but de la fonction ou du composant.
    -   `@param` pour chaque paramètre, avec son type et sa description.
    -   `@returns` pour décrire la valeur de retour.

## 4. Cohérence du Code et Conventions

-   **Règle** : Maintenir une cohérence stricte dans tout le code, en particulier pour la conversion des noms de champs entre la base de données (**snake_case**) et le frontend (**camelCase**).
-   **Justification** : Cette convention évite la confusion et les erreurs lors de la manipulation des objets de données à travers les différentes couches de l'application.
-   **Implémentation** : Utiliser systématiquement les fonctions de mappage (dans `lib/mappers.ts`) au sein des services pour effectuer cette conversion. Le reste de l'application (hooks, composants) ne doit manipuler que des objets en `camelCase`.
