# URGENT : Configuration Variables Vercel

## ⚠️ Problème Identifié

Vercel **NE LIT PAS** les fichiers `.env.preview` ou `.env.production` du repository automatiquement.

Vous devez **manuellement** configurer les variables dans le dashboard Vercel.

---

## 🎯 Solution : Configurer les Variables dans Vercel Dashboard

### Étape 1 : Accéder aux Variables d'Environnement

1. Allez sur [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet **`new-version-aylf-app-yzwe`**
3. Cliquez sur **Settings** (en haut)
4. Cliquez sur **Environment Variables** (menu de gauche)

### Étape 2 : Ajouter les Variables une par une

Pour **CHAQUE variable** ci-dessous, cliquez sur **"Add New"** :

#### 🔹 KINDE_SITE_URL
- **Name**: `KINDE_SITE_URL`
- **Value**: `https://new-version-aylf-app-yzwe.vercel.app`
- **Environment**: Cochez **Production**, **Preview**, et **Development**
- Cliquez **Save**

#### 🔹 KINDE_POST_LOGOUT_REDIRECT_URL
- **Name**: `KINDE_POST_LOGOUT_REDIRECT_URL`
- **Value**: `https://new-version-aylf-app-yzwe.vercel.app`
- **Environment**: Cochez **Production**, **Preview**, et **Development**
- Cliquez **Save**

#### 🔹 KINDE_POST_LOGIN_REDIRECT_URL
- **Name**: `KINDE_POST_LOGIN_REDIRECT_URL`
- **Value**: `https://new-version-aylf-app-yzwe.vercel.app/dashboard`
- **Environment**: Cochez **Production**, **Preview**, et **Development**
- Cliquez **Save**

---

### Étape 3 : REDÉPLOYER

**CRUCIAL** : Les variables ne sont appliquées qu'au prochain déploiement !

1. Allez dans **Deployments**
2. Trouvez le dernier déploiement (celui qui est "Ready")
3. Cliquez sur les **3 points (...)** à droite
4. Cliquez sur **Redeploy**
5. Confirmez

### Étape 4 : Attendre le Déploiement

Attendez que le nouveau déploiement soit **Ready** (vert).

---

## ✅ Vérification

Après le redéploiement :

1. **Ouvrez votre application** : https://new-version-aylf-app-yzwe.vercel.app
2. **Connectez-vous**
3. **Testez le logout** :
   - Cliquez sur votre avatar > Log out
   - **Attendu** : Redirigé vers https://new-version-aylf-app-yzwe.vercel.app (PAS localhost)

4. **Testez une invitation** :
   - Créez une invitation
   - Acceptez-la
   - **Attendu** : Après login Kinde, redirigé vers https://new-version-aylf-app-yzwe.vercel.app/dashboard (PAS localhost)

---

## 🐛 Si le problème persiste encore

### Option 1 : Vérifier que les variables sont bien enregistrées

1. Dans Vercel > Settings > Environment Variables
2. Vérifiez que les 3 variables apparaissent dans la liste
3. Vérifiez que l'environnement **Preview** est bien coché

### Option 2 : Vérifier les logs de build

1. Allez dans Deployments
2. Cliquez sur le dernier déploiement
3. Allez dans **Build Logs**
4. Cherchez "KINDE_SITE_URL" pour voir si Vercel charge la variable

### Option 3 : Runtime Logs

1. Dans le déploiement, allez dans **Runtime Logs**
2. Essayez de vous connecter et de vous déconnecter
3. Les logs montreront quelle URL Kinde utilise

---

## 📸 Capture d'écran attendue

Vous devriez voir dans **Environment Variables** :

```
KINDE_SITE_URL                        https://new-version-a...    Production, Preview, Development
KINDE_POST_LOGOUT_REDIRECT_URL        https://new-version-a...    Production, Preview, Development  
KINDE_POST_LOGIN_REDIRECT_URL         https://new-version-a...    Production, Preview, Development
```

---

## 🎯 Checklist

- [ ] J'ai ajouté KINDE_SITE_URL dans Vercel
- [ ] J'ai ajouté KINDE_POST_LOGOUT_REDIRECT_URL dans Vercel
- [ ] J'ai ajouté KINDE_POST_LOGIN_REDIRECT_URL dans Vercel
- [ ] J'ai coché "Preview" pour les 3 variables
- [ ] J'ai redéployé l'application
- [ ] J'ai attendu la fin du déploiement (statut "Ready")
- [ ] J'ai testé le logout → fonctionne ✅
- [ ] J'ai testé l'invitation → fonctionne ✅
