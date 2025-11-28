### Invitation d'un Nouvel Utilisateur

Le système permet à un administrateur (`national_coordinator`) d'inviter de nouveaux utilisateurs.

**Flux d'Acceptation de l'Invitation**

1.  **Envoi de l'E-mail :** L'API `POST /api/users/invite` génère une invitation via `supabase.auth.admin.inviteUserByEmail`. Le lien envoyé contient un `token_hash` et un type (`invite`).
2.  **Clic de l'Utilisateur :** L'utilisateur clique sur "Accept the invite".
3.  **Redirection vers le Callback :** Supabase valide le token et redirige l'utilisateur vers l'URL spécifiée dans le `redirectTo` de l'invitation (configurée pour être `https://<votre-domaine>/auth/callback`).
    -   **Point de Vigilance :** Toutes les URLs de déploiement (production, previews Vercel, localhost) doivent être ajoutées à la liste blanche dans `Supabase Dashboard > Authentication > URL Configuration`. Une URL non listée provoquera une redirection par défaut vers `/login`, bloquant l'utilisateur.
4.  **Traitement par le Callback ([/auth/callback/route.ts](cci:7://file:///c:/Users/Guelo/Downloads/AYLF_APP/aylf-group-tracker-main/src/app/auth/callback/route.ts:0:0-0:0)) :**
    -   La route détecte la présence de `token_hash` et `type=invite`.
    -   Elle utilise `supabase.auth.verifyOtp()` pour créer la session utilisateur.
    -   Elle vérifie si un profil existe pour ce nouvel utilisateur.
    -   **Cas 1 (Nouveau Profil) :** Si aucun profil n'existe, il est créé (upsert) avec les métadonnées de l'invitation (`role`, `site_id`, etc.). L'utilisateur est ensuite **redirigé vers `/auth/setup`** pour définir son mot de passe.
    -   **Cas 2 (Profil Existant) :** L'utilisateur est redirigé directement vers son tableau de bord (`/dashboard`).