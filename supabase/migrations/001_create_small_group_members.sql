-- =============================================================================
-- MIGRATION: Création de la table `small_group_members`
-- Description: Cette migration crée la table de liaison entre les utilisateurs
-- et les petits groupes, et configure les politiques de sécurité (RLS).
-- =============================================================================

-- 1. TABLE `small_group_members`
-- Table de liaison pour l'appartenance des membres (profiles) aux petits groupes.
CREATE TABLE public.small_group_members (
  small_group_id uuid NOT NULL REFERENCES public.small_groups(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),

  -- Une personne ne peut être dans un groupe qu'une seule fois.
  PRIMARY KEY (small_group_id, profile_id)
);

-- 2. ACTIVER RLS (Row Level Security)
ALTER TABLE public.small_group_members ENABLE ROW LEVEL SECURITY;

-- 3. POLITIQUES DE SÉCURITÉ

-- Politique de SÉLECTION (SELECT)
-- Les utilisateurs peuvent voir les membres des groupes auxquels ils appartiennent
-- ou qu'ils supervisent.
CREATE POLICY "Les utilisateurs peuvent voir les membres de leurs groupes" 
ON public.small_group_members FOR SELECT
USING (
  get_my_role() = 'national_coordinator' OR
  (get_my_role() = 'site_coordinator' AND small_group_id IN (SELECT id FROM public.small_groups WHERE site_id = get_my_site_id())) OR
  (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id()) OR
  (profile_id = auth.uid()) -- Un membre peut voir ses propres appartenances
);

-- Politique d'INSERTION (INSERT)
-- Seuls les leaders de groupe et les coordinateurs peuvent ajouter des membres.
CREATE POLICY "Les leaders et coordinateurs peuvent ajouter des membres" 
ON public.small_group_members FOR INSERT
WITH CHECK (
  get_my_role() = 'national_coordinator' OR
  (get_my_role() = 'site_coordinator' AND small_group_id IN (SELECT id FROM public.small_groups WHERE site_id = get_my_site_id())) OR
  (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
);

-- Politique de SUPPRESSION (DELETE)
-- Seuls les leaders de groupe et les coordinateurs peuvent retirer des membres.
CREATE POLICY "Les leaders et coordinateurs peuvent retirer des membres" 
ON public.small_group_members FOR DELETE
USING (
  get_my_role() = 'national_coordinator' OR
  (get_my_role() = 'site_coordinator' AND small_group_id IN (SELECT id FROM public.small_groups WHERE site_id = get_my_site_id())) OR
  (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
);

