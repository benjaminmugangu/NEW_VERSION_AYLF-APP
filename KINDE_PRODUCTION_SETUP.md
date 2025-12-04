# Guide de Configuration Kinde pour Production

## 🎯 Problème Actuel
Les redirections pointent vers localhost au lieu de l'URL de production Vercel.

## 📝 Solution : Configurer Kinde Dashboard

### Étape 1 : Accéder à Kinde Dashboard

1. Allez sur [https://app.kinde.com](https://app.kinde.com)
2. Sélectionnez votre application principale

### Étape 2 : Configurer les URLs de Callback

1. Allez dans **Settings** > **Environment details**
2. Trouvez la section **"Allowed callback URLs"**
3. **Ajoutez** les URLs suivantes (séparez par des virgules) :

```
http://localhost:3000/api/auth/kinde_callback,
https://new-version-aylf-app-yzwe.vercel.app/api/auth/kinde_callback
```

**⚠️ Important** : Gardez l'URL localhost pour le développement local ET ajoutez l'URL de production

### Étape 3 : Configurer les URLs de Redirect après Logout

1. Dans la même page **Environment details**
2. Trouvez la section **"Allowed logout redirect URLs"**
3. **Ajoutez** les URLs suivantes :

```
http://localhost:3000,
https://new-version-aylf-app-yzwe.vercel.app
```

### Étape 4 : Configurer les URLs de Redirect après Login

1. Toujours dans **Environment details**
2. Trouvez la section **"Allowed redirect URLs"** (peut être nommée différemment)
3. **Ajoutez** les URLs suivantes :

```
http://localhost:3000/dashboard,
https://new-version-aylf-app-yzwe.vercel.app/dashboard
```

### Étape 5 : Sauvegarder

1. Cliquez sur **Save** en bas de la page
2. Attendez la confirmation

---

## ✅ Vérification

Après avoir configuré Kinde :

### Test 1 : Logout
1. Allez sur https://new-version-aylf-app-yzwe.vercel.app
2. Connectez-vous
3. Cliquez sur logout
4. **Attendu** : Vous êtes redirigé vers https://new-version-aylf-app-yzwe.vercel.app (pas localhost)

### Test 2 : Invitation
1. Créez une invitation depuis le dashboard
2. Cliquez sur le lien d'invitation
3. Cliquez sur "Accept & Login"
4. Créez votre compte Kinde
5. **Attendu** : Vous êtes redirigé vers https://new-version-aylf-app-yzwe.vercel.app/dashboard (pas localhost)

---

## 📌 Variables d'Environnement Vercel (Déjà configurées normalement)

Si les tests échouent encore après la configuration Kinde, vérifiez que ces variables sont bien définies dans **Vercel > Settings > Environment Variables** :

```env
KINDE_SITE_URL=https://new-version-aylf-app-yzwe.vercel.app
KINDE_POST_LOGOUT_REDIRECT_URL=https://new-version-aylf-app-yzwe.vercel.app
KINDE_POST_LOGIN_REDIRECT_URL=https://new-version-aylf-app-yzwe.vercel.app/dashboard
```

**Après avoir modifié ces variables** : Redéployez l'application dans Vercel (Deployments > Redeploy).

---

## 🔍 Debug : Comment savoir d'où vient le problème

### Si redirigé vers localhost après logout :
- ❌ Kinde Dashboard > Allowed logout redirect URLs ne contient pas l'URL de production
- ❌ Variable `KINDE_POST_LOGOUT_REDIRECT_URL` mal configurée dans Vercel

### Si redirigé vers localhost après login :
- ❌ Kinde Dashboard > Allowed callback URLs ne contient pas l'URL de production
- ❌ Variable `KINDE_POST_LOGIN_REDIRECT_URL` mal configurée dans Vercel

---

## 🎯 Checklist Final

- [ ] Kinde Dashboard : Allowed callback URLs contient l'URL production
- [ ] Kinde Dashboard : Allowed logout redirect URLs contient l'URL production  
- [ ] Kinde Dashboard : Allowed redirect URLs contient l'URL production/dashboard
- [ ] Vercel : KINDE_SITE_URL configuré
- [ ] Vercel : KINDE_POST_LOGOUT_REDIRECT_URL configuré
- [ ] Vercel : KINDE_POST_LOGIN_REDIRECT_URL configuré
- [ ] Test logout fonctionne ✅
- [ ] Test invitation fonctionne ✅
