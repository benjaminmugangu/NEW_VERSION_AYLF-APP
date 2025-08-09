-- =============================================================================
-- MIGRATION: Création de la table `activity_participants`
-- Description: Crée la table de liaison pour suivre les participants (profiles)
-- aux activités.
-- =============================================================================

-- 1. TABLE `activity_participants`
CREATE TABLE public.activity_participants (
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),

  PRIMARY KEY (activity_id, profile_id)
);

-- 2. ACTIVER RLS (Row Level Security)
ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;

-- 3. POLITIQUES DE SÉCURITÉ (Exemples - à affiner selon les besoins)

-- Les utilisateurs authentifiés peuvent voir les participations (très permissif, à ajuster)
CREATE POLICY "Les utilisateurs peuvent voir les participations aux activités" 
ON public.activity_participants FOR SELECT
USING (auth.role() = 'authenticated');

-- Les utilisateurs peuvent s'inscrire à une activité (ajouter leur propre participation)
CREATE POLICY "Les utilisateurs peuvent s'inscrire aux activités" 
ON public.activity_participants FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- Les utilisateurs peuvent se désinscrire d'une activité
CREATE POLICY "Les utilisateurs peuvent se désinscrire des activités" 
ON public.activity_participants FOR DELETE
USING (profile_id = auth.uid());
