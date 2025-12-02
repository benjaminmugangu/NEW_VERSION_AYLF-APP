# 🔄 Reset Complet des Variables d'Environnement Vercel

## ✅ Oui, recommencer à zéro est une bonne idée !

Cela éliminera tout conflit ou typo possible.

---

## 📋 LISTE COMPLÈTE des Variables Requises

Voici **TOUTES** les variables dont vous avez besoin dans Vercel :

### 1️⃣ Variables Kinde (AUTH)

```
KINDE_CLIENT_ID=<votre_client_id>
KINDE_CLIENT_SECRET=<votre_client_secret>
KINDE_ISSUER_URL=<votre_issuer_url>
KINDE_SITE_URL=https://new-version-aylf-app-yzwe.vercel.app
KINDE_POST_LOGOUT_REDIRECT_URL=https://new-version-aylf-app-yzwe.vercel.app
KINDE_POST_LOGIN_REDIRECT_URL=https://new-version-aylf-app-yzwe.vercel.app/dashboard
```

### 2️⃣ Variables Kinde Management (Invitations)

```
KINDE_MANAGEMENT_CLIENT_ID=<votre_management_client_id>
KINDE_MANAGEMENT_CLIENT_SECRET=<votre_management_client_secret>
```

### 3️⃣ Variables Base de Données

```
DATABASE_URL=<votre_database_url>
DIRECT_URL=<votre_direct_url>
```

### 4️⃣ Variables Next.js

```
NEXT_PUBLIC_APP_URL=https://new-version-aylf-app-yzwe.vercel.app
```

### 5️⃣ Variables Supabase (si encore utilisées)

```
NEXT_PUBLIC_SUPABASE_URL=<votre_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<votre_supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<votre_supabase_service_key>
```

---

## 🗑️ Étape 1 : TOUT EFFACER

1. **Allez dans Vercel** > Votre projet > **Settings** > **Environment Variables**
2. **Pour chaque variable** :
   - Cliquez sur les **3 points (...)** à droite
   - Cliquez sur **Delete**
   - Confirmez
3. **Vérifiez** que la liste est **complètement vide**

---

## ➕ Étape 2 : AJOUTER LES VARIABLES UNE PAR UNE

### Important : Pour CHAQUE variable

**Cochez les 3 environnements** : ✅ Production, ✅ Preview, ✅ Development

---

### Variable 1 : KINDE_CLIENT_ID

1. Cliquez sur **Add New**
2. **Name**: `KINDE_CLIENT_ID`
3. **Value**: `<collez votre Kinde Client ID depuis Kinde Dashboard>`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

### Variable 2 : KINDE_CLIENT_SECRET

1. Cliquez sur **Add New**
2. **Name**: `KINDE_CLIENT_SECRET`
3. **Value**: `<collez votre secret depuis Kinde Dashboard>`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

### Variable 3 : KINDE_ISSUER_URL

1. Cliquez sur **Add New**
2. **Name**: `KINDE_ISSUER_URL`
3. **Value**: `<https://votredomain.kinde.com>` (depuis Kinde Dashboard)
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

### Variable 4 : KINDE_SITE_URL ⭐ CRITIQUE

1. Cliquez sur **Add New**
2. **Name**: `KINDE_SITE_URL`
3. **Value**: `https://new-version-aylf-app-yzwe.vercel.app`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

⚠️ **Vérifiez bien qu'il n'y a PAS de `/` à la fin !**

### Variable 5 : KINDE_POST_LOGOUT_REDIRECT_URL ⭐ CRITIQUE

1. Cliquez sur **Add New**
2. **Name**: `KINDE_POST_LOGOUT_REDIRECT_URL`
3. **Value**: `https://new-version-aylf-app-yzwe.vercel.app`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

⚠️ **Pas de `/` à la fin !**

### Variable 6 : KINDE_POST_LOGIN_REDIRECT_URL ⭐ CRITIQUE

1. Cliquez sur **Add New**
2. **Name**: `KINDE_POST_LOGIN_REDIRECT_URL`
3. **Value**: `https://new-version-aylf-app-yzwe.vercel.app/dashboard`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

⚠️ **Avec `/dashboard` à la fin cette fois !**

### Variable 7 : KINDE_MANAGEMENT_CLIENT_ID

1. Cliquez sur **Add New**
2. **Name**: `KINDE_MANAGEMENT_CLIENT_ID`
3. **Value**: `<depuis Kinde > Machine to Machine apps>`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

### Variable 8 : KINDE_MANAGEMENT_CLIENT_SECRET

1. Cliquez sur **Add New**
2. **Name**: `KINDE_MANAGEMENT_CLIENT_SECRET`
3. **Value**: `<depuis Kinde > Machine to Machine apps>`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

### Variable 9 : DATABASE_URL

1. Cliquez sur **Add New**
2. **Name**: `DATABASE_URL`
3. **Value**: `<votre Postgres connection string avec pooling>`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

### Variable 10 : DIRECT_URL

1. Cliquez sur **Add New**
2. **Name**: `DIRECT_URL`
3. **Value**: `<votre Postgres direct connection string>`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

### Variable 11 : NEXT_PUBLIC_APP_URL

1. Cliquez sur **Add New**
2. **Name**: `NEXT_PUBLIC_APP_URL`
3. **Value**: `https://new-version-aylf-app-yzwe.vercel.app`
4. **Environment**: ✅ Production ✅ Preview ✅ Development
5. Cliquez **Save**

### Variables 12-14 : Supabase (si utilisées)

Répétez le processus pour :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 Étape 3 : REDÉPLOYER

1. **Allez dans Deployments**
2. Trouvez le dernier déploiement
3. Cliquez sur **3 points (...)** > **Redeploy**
4. **Attendez** que le statut passe à **Ready** (vert)

---

## ✅ Étape 4 : VÉRIFICATION FINALE

### Vérifier que les variables sont bien enregistrées

Dans **Environment Variables**, vous devriez voir quelque chose comme :

```
KINDE_CLIENT_ID                    abc123...              Production, Preview, Development
KINDE_CLIENT_SECRET                ***                    Production, Preview, Development
KINDE_ISSUER_URL                   https://...kinde.com   Production, Preview, Development
KINDE_SITE_URL                     https://new-version... Production, Preview, Development
KINDE_POST_LOGOUT_REDIRECT_URL     https://new-version... Production, Preview, Development
KINDE_POST_LOGIN_REDIRECT_URL      https://new-version... Production, Preview, Development
...
```

**Vérifiez SURTOUT** :
- ✅ Toutes ont **"Preview"** coché
- ✅ Les URLs ne contiennent PAS "localhost"
- ✅ Pas de typos dans les noms de variables

---

## 🧪 Étape 5 : TESTER

### Test 1 : Logout

1. Allez sur https://new-version-aylf-app-yzwe.vercel.app
2. Connectez-vous
3. **Ouvrez les DevTools du navigateur** (F12)
4. Allez dans l'onglet **Network**
5. Cliquez sur Logout
6. **Regardez l'URL de redirection** dans la Network tab
   - ✅ Devrait être : `https://new-version-aylf-app-yzwe.vercel.app`
   - ❌ Si c'est : `http://localhost:3000` → Le problème persiste

### Test 2 : Invitation

1. Créez une invitation
2. **Ouvrez le lien d'invitation dans un nouvel onglet privé**
3. Cliquez sur "Accept & Login"
4. Créez/connectez votre compte Kinde
5. **Regardez l'URL finale**
   - ✅ Devrait être : `https://new-version-aylf-app-yzwe.vercel.app/dashboard`
   - ❌ Si c'est : `http://localhost:3000/dashboard` → Le problème persiste

---

## 🐛 Si le problème persiste ENCORE

Si après tout ça, vous êtes toujours redirigé vers localhost :

### Dernière option : Vérifier le Cache

1. **Videz le cache de votre navigateur** :
   - Chrome/Edge : Ctrl+Shift+Delete
   - Cochez "Cached images and files"
   - Cliquez "Clear data"

2. **Testez dans un navigateur complètement différent** (Firefox si vous utilisez Chrome, etc.)

3. **Testez dans un onglet privé/incognito**

### Capture d'écran pour Debug

Si ça ne fonctionne TOUJOURS pas, capturez :
1. Screenshot de vos **Environment Variables** dans Vercel
2. Screenshot de la **Network tab** pendant le logout
3. Screenshot de votre configuration **Kinde Dashboard > Allowed callback URLs**

Et envoyez-moi ça pour qu'on puisse voir exactement ce qui se passe.

---

## 📝 Checklist Finale

- [ ] J'ai SUPPRIMÉ toutes les anciennes variables
- [ ] J'ai ajouté les 11+ variables requises
- [ ] J'ai coché "Preview" pour TOUTES les variables
- [ ] J'ai vérifié qu'il n'y a pas de typos
- [ ] Les URLs ne contiennent PAS localhost
- [ ] J'ai REDÉPLOYÉ l'application
- [ ] J'ai attendu que le déploiement soit "Ready"
- [ ] J'ai VIDÉ le cache du navigateur
- [ ] J'ai testé dans un onglet incognito
- [ ] Le logout fonctionne ✅
- [ ] L'invitation fonctionne ✅
