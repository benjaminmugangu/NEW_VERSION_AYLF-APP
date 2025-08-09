-- =============================================================================
-- MIGRATION: Définition des politiques de sécurité pour la table `reports`
-- Description: Cette migration crée ou met à jour les politiques RLS pour la
-- table des rapports afin de garantir que les utilisateurs ne voient que les
-- données auxquelles ils sont autorisés à accéder.
-- =============================================================================

-- 1. ACTIVER RLS (Row Level Security) sur la table `reports`
-- Il est sécuritaire d'exécuter cette commande même si RLS est déjà activé.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 2. POLITIQUE DE SÉLECTION (SELECT)
-- Supprime l'ancienne politique si elle existe pour éviter les conflits.
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les rapports pertinents" ON public.reports;

-- Crée la nouvelle politique de sélection.
CREATE POLICY "Les utilisateurs peuvent voir les rapports pertinents"
ON public.reports FOR SELECT
USING (
  -- Le coordinateur national peut tout voir.
  get_my_role() = 'national_coordinator' OR
  
  -- Un coordinateur de site peut voir les rapports de son site.
  (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
  
  -- Un leader de petit groupe peut voir les rapports de son groupe.
  (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id()) OR
  
  -- Chaque utilisateur peut voir les rapports qu'il a lui-même soumis.
  (submitted_by = auth.uid())
);

-- 3. POLITIQUE D'INSERTION (INSERT)
-- Supprime l'ancienne politique si elle existe.
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des rapports" ON public.reports;

-- La politique vérifie que l'utilisateur soumet le rapport pour lui-même et pour le niveau correspondant à son rôle.
CREATE POLICY "Les utilisateurs peuvent créer des rapports selon leur rôle"
ON public.reports FOR INSERT
WITH CHECK (
  -- L'utilisateur doit être celui qui soumet le rapport.
  submitted_by = auth.uid() AND
  (
    -- Les coordinateurs nationaux peuvent soumettre des rapports nationaux.
    (get_my_role() = 'national_coordinator' AND level = 'national') OR

    -- Les coordinateurs de site peuvent soumettre des rapports pour leur propre site.
    (get_my_role() = 'site_coordinator' AND level = 'site' AND site_id = get_my_site_id()) OR

    -- Les leaders de petits groupes peuvent soumettre des rapports pour leur propre groupe.
    (get_my_role() = 'small_group_leader' AND level = 'small_group' AND small_group_id = get_my_small_group_id())
  )
);

-- 4. POLITIQUE DE MISE À JOUR (UPDATE)
-- Supprime l'ancienne politique si elle existe.
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs propres rapports ou les coordinateurs peuvent mettre à jour" ON public.reports;

-- Permet à un utilisateur de mettre à jour son propre rapport (s'il est en attente)
-- ou à un coordinateur de le mettre à jour (pour approbation/rejet).
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres rapports ou les coordinateurs peuvent mettre à jour"
ON public.reports FOR UPDATE
USING (
  (get_my_role() = 'national_coordinator') OR
  (submitted_by = auth.uid() AND status = 'pending')
)
WITH CHECK (
  (get_my_role() = 'national_coordinator') OR
  (submitted_by = auth.uid() AND status = 'pending')
);

-- 5. POLITIQUE DE SUPPRESSION (DELETE)
-- Supprime l'ancienne politique si elle existe.
DROP POLICY IF EXISTS "Seuls les coordinateurs nationaux peuvent supprimer des rapports" ON public.reports;

-- Pour des raisons de sécurité, seul le coordinateur national peut supprimer un rapport.
CREATE POLICY "Seuls les coordinateeurs nationaux peuvent supprimer des rapports"
ON public.reports FOR DELETE
USING (get_my_role() = 'national_coordinator');
