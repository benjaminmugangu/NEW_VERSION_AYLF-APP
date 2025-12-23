# Guide Détaillé: Application des Politiques RLS Storage

## 🎯 Objectif
Sécuriser le bucket `report-images` pour que seuls les utilisateurs autorisés puissent uploader/voir/supprimer des fichiers selon leur rôle.

## ⏱️ Temps requis: 10-15 minutes

---

## Étape 1️⃣: Ouvrir Supabase Dashboard

### Actions:
1. Ouvrez votre navigateur
2. Allez sur: **https://supabase.com/dashboard**
3. **Connectez-vous** avec vos identifiants Supabase
4. Sélectionnez votre projet AYLF Group Tracker

---

## Étape 2️⃣: Naviguer vers Storage

### Actions:
1. Dans le menu de gauche, cliquez sur **"Storage"** (icône de dossier)
2. Vous verrez la liste de vos buckets
3. Cliquez sur le bucket **"report-images"**
   - Si ce bucket n'existe pas, créez-le d'abord:
     - Cliquez "New bucket"
     - Nom: `report-images`
     - Public: **NON** (décoché)
     - Cliquez "Create bucket"

---

## Étape 3️⃣: Accéder aux Policies

### Actions:
1. Une fois dans le bucket `report-images`
2. En haut, vous verrez plusieurs onglets: **Files** | **Policies** | **Settings**
3. Cliquez sur l'onglet **"Policies"**
4. Vous verrez probablement "No policies created yet"

---

## Étape 4️⃣: Créer la Politique 1 - UPLOAD

### Actions:
1. Cliquez sur le bouton **"New Policy"**
2. Sélectionnez **"For full customization"** (pas les templates)
3. Une fenêtre s'ouvre avec un formulaire

### Remplissez:

**Policy name:**
```
Hierarchical upload for report-images
```

**Allowed operation:**
- ☑️ **INSERT** (coché)
- ☐ SELECT (décoché)
- ☐ UPDATE (décoché)
- ☐ DELETE (décoché)

**Target roles:**
- Sélectionnez: **authenticated**

**USING expression:** (laissez vide)

**WITH CHECK expression:** (copiez-collez ceci)
```sql
(bucket_id = 'report-images' AND (
  -- National Coordinator: Can upload anywhere
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'national_coordinator'
  OR
  -- Site Coordinator: Can upload for their site
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'site_coordinator'
    AND
    (SELECT site_id FROM public.profiles WHERE id = auth.uid()::text) = split_part(name, '/', 1)
  )
  OR
  -- Small Group Leader: Can upload for their group
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'small_group_leader'
    AND
    (SELECT small_group_id FROM public.profiles WHERE id = auth.uid()::text) = split_part(name, '/', 2)
  )
))
```

4. Cliquez **"Review"**
5. Vérifiez que tout est correct
6. Cliquez **"Save Policy"**

✅ **Politique 1/4 appliquée!**

---

## Étape 5️⃣: Créer la Politique 2 - VIEW/DOWNLOAD

### Actions:
1. Cliquez à nouveau sur **"New Policy"**
2. Sélectionnez **"For full customization"**

### Remplissez:

**Policy name:**
```
Hierarchical view for report-images
```

**Allowed operation:**
- ☐ INSERT (décoché)
- ☑️ **SELECT** (coché)
- ☐ UPDATE (décoché)
- ☐ DELETE (décoché)

**Target roles:**
- Sélectionnez: **authenticated**

**USING expression:** (copiez-collez ceci)
```sql
(bucket_id = 'report-images' AND (
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'national_coordinator'
  OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'site_coordinator'
    AND
    (SELECT site_id FROM public.profiles WHERE id = auth.uid()::text) = split_part(name, '/', 1)
  )
  OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'small_group_leader'
    AND
    (SELECT small_group_id FROM public.profiles WHERE id = auth.uid()::text) = split_part(name, '/', 2)
  )
))
```

**WITH CHECK expression:** (laissez vide)

3. Cliquez **"Review"**
4. Cliquez **"Save Policy"**

✅ **Politique 2/4 appliquée!**

---

## Étape 6️⃣: Créer la Politique 3 - DELETE

### Actions:
1. Cliquez **"New Policy"**
2. Sélectionnez **"For full customization"**

### Remplissez:

**Policy name:**
```
National coordinators can delete report-images
```

**Allowed operation:**
- ☐ INSERT (décoché)
- ☐ SELECT (décoché)
- ☐ UPDATE (décoché)
- ☑️ **DELETE** (coché)

**Target roles:**
- Sélectionnez: **authenticated**

**USING expression:** (copiez-collez ceci)
```sql
(bucket_id = 'report-images' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'national_coordinator')
```

**WITH CHECK expression:** (laissez vide)

3. Cliquez **"Review"**
4. Cliquez **"Save Policy"**

✅ **Politique 3/4 appliquée!**

---

## Étape 7️⃣: Créer la Politique 4 - UPDATE

### Actions:
1. Cliquez **"New Policy"**
2. Sélectionnez **"For full customization"**

### Remplissez:

**Policy name:**
```
National coordinators can update report-images
```

**Allowed operation:**
- ☐ INSERT (décoché)
- ☐ SELECT (décoché)
- ☑️ **UPDATE** (coché)
- ☐ DELETE (décoché)

**Target roles:**
- Sélectionnez: **authenticated**

**USING expression:** (copiez-collez ceci)
```sql
(bucket_id = 'report-images' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'national_coordinator')
```

**WITH CHECK expression:** (laissez vide)

3. Cliquez **"Review"**
4. Cliquez **"Save Policy"**

✅ **Politique 4/4 appliquée!**

---

## Étape 8️⃣: Vérification

### Actions:
1. Dans l'onglet **"Policies"**, vous devriez maintenant voir **4 politiques**:
   - ✅ Hierarchical upload for report-images (INSERT)
   - ✅ Hierarchical view for report-images (SELECT)
   - ✅ National coordinators can delete report-images (DELETE)
   - ✅ National coordinators can update report-images (UPDATE)

2. **Test via SQL Editor** (optionnel):
   - Allez dans **SQL Editor**
   - Exécutez:
   ```sql
   SELECT COUNT(*) 
   FROM pg_policies 
   WHERE schemaname = 'storage' 
     AND tablename = 'objects';
   ```
   - Devrait retourner: **4** (ou plus si vous avez d'autres buckets)

---

## 🎉 TERMINÉ!

### Qu'avez-vous accompli?
- ✅ Seuls les utilisateurs authentifiés peuvent accéder aux fichiers
- ✅ Upload restreint par rôle et hiérarchie
- ✅ Visualisation limitée à votre scope (site/groupe)
- ✅ Suppression réservée aux National Coordinators
- ✅ Modification réservée aux National Coordinators

### Structure de fichiers requise:
Pour que RLS fonctionne, les fichiers doivent suivre cette structure:
- National: `{reportId}/{filename}`
- Site: `{siteId}/{reportId}/{filename}`
- Groupe: `{siteId}/{groupId}/{reportId}/{filename}`

Le service `storageService.ts` fait déjà ça automatiquement!

---

## ⚠️ En cas de problème

### Erreur "syntax error"
- Vérifiez que vous avez bien copié TOUT le code SQL
- Pas d'espaces manquants ou de caractères bizarres

### Politique ne se sauvegarde pas
- Assurez-vous d'avoir sélectionné le bon "Target role" (authenticated)
- Vérifiez que l'opération correcte est cochée

### Besoin d'aide?
- Prenez une capture d'écran de l'erreur
- Notez le nom de la politique qui pose problème
- Je peux vous aider à débugger

---

## 📊 Phase 1 Status Final

Après ces étapes:
- ✅ SQL RLS Fixes appliqués
- ✅ Storage RLS Policies appliquées
- 🎯 **Phase 1 COMPLÈTE à 95%!**

Reste uniquement:
- 🔵 Identity sync audit (optionnel)
- 🔵 Wrapping des 26 routes API restantes (recommandé mais pas bloquant)
