# Configuration Supabase pour le Système d'Invitation

## Configuration Requise dans le Dashboard Supabase

### 1. URLs de Redirection (Authentication > URL Configuration)

Ajoutez les URLs suivantes dans la section "Redirect URLs" :

```
https://new-version-aylf-app-yzwe-git-8f7981-benjamin-mugangus-projects.vercel.app/auth/callback
https://new-version-aylf-app-yzwe-lp6xi72u5-benjamin-mugangus-projects.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

### 2. Configuration des E-mails (Authentication > Email Templates)

#### Template "Invite user"
- **Subject** : `Invitation à rejoindre AYLF - Action requise`
- **Body** : 
```html
<h2>Vous avez été invité à rejoindre AYLF</h2>
<p>Bonjour,</p>
<p>Vous avez été invité à rejoindre la plateforme AYLF en tant que {{ .Role }}.</p>
<p>Pour activer votre compte et définir votre mot de passe, cliquez sur le lien ci-dessous :</p>
<p><a href="{{ .ConfirmationURL }}">Activer mon compte</a></p>
<p>Ce lien expirera dans 24 heures.</p>
<p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet e-mail.</p>
<p>Cordialement,<br>L'équipe AYLF</p>
```

### 3. Variables d'Environnement Requises

Assurez-vous que ces variables sont configurées :

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Politiques RLS (Row Level Security)

Les politiques suivantes doivent être configurées dans la table `profiles` :

```sql
-- Permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Permettre aux coordinateurs nationaux de voir tous les profils
CREATE POLICY "National coordinators can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'national_coordinator'
  )
);

-- Permettre la création de profils lors de l'invitation
CREATE POLICY "Allow profile creation on invitation" ON profiles
FOR INSERT WITH CHECK (true);

-- Permettre la mise à jour du profil par l'utilisateur lui-même
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);
```

## Flux d'Invitation Implémenté

1. **Invitation** : L'administrateur utilise `/dashboard/users/new` pour inviter un utilisateur
2. **E-mail automatique** : Supabase envoie automatiquement un e-mail d'invitation
3. **Callback** : L'utilisateur clique sur le lien et est redirigé vers `/auth/callback`
4. **Setup** : Les nouveaux utilisateurs sont redirigés vers `/auth/setup` pour définir leur mot de passe
5. **Dashboard** : Une fois configuré, l'utilisateur accède au tableau de bord

## Test de la Configuration

Pour tester le système d'invitation :

1. Connectez-vous en tant que `national_coordinator`
2. Allez sur `/dashboard/users/new`
3. Remplissez le formulaire d'invitation
4. Vérifiez que l'e-mail d'invitation est envoyé
5. Cliquez sur le lien dans l'e-mail
6. Complétez la configuration du compte
7. Vérifiez l'accès au dashboard
