-- =============================================================================
-- AYLF GROUP TRACKER - DATABASE SCHEMA
-- Version: 1.1
-- Description: Schéma complet pour la base de données Supabase, incluant les
-- tables, relations, fonctions, déclencheurs et politiques de sécurité (RLS).
-- =============================================================================

-- 1. TABLE `activity_types`
-- Contient les catégories d'activités prédéfinies, gérées par le coordinateur national.
CREATE TABLE public.activity_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 2. TABLE `sites`
-- Contient tous les sites opérationnels (ex: Goma, Kinshasa).
CREATE TABLE public.sites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  coordinator_id uuid, -- Sera lié à profiles.id plus tard
  created_at timestamptz DEFAULT now()
);

-- 3. TABLE `small_groups`
-- Contient tous les petits groupes, chacun lié à un site.
CREATE TABLE public.small_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  leader_id uuid, -- Sera lié à profiles.id
  logistics_assistant_id uuid, -- Sera lié à profiles.id
  finance_assistant_id uuid, -- Sera lié à profiles.id
  -- AJOUTS v1.1: Champs pour la gestion des réunions
  meeting_day text,
  meeting_time time,
  meeting_location text,
  created_at timestamptz DEFAULT now()
);

-- 4. TABLE `profiles`
-- Stocke les données publiques des utilisateurs (rôle, assignation, etc.).
-- Liée à la table `auth.users` de Supabase.
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  -- AJOUT v1.1: Champ pour l'image de profil
  avatar_url text,
  role text,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  small_group_id uuid REFERENCES public.small_groups(id) ON DELETE SET NULL,
  mandate_start_date timestamptz,
  mandate_end_date timestamptz,
  status text DEFAULT 'active'::text,
  created_at timestamptz DEFAULT now()
);

-- Ajout des contraintes de clé étrangère pour sites et small_groups qui référencent profiles
ALTER TABLE public.sites ADD CONSTRAINT fk_coordinator
  FOREIGN KEY (coordinator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.small_groups ADD CONSTRAINT fk_leader
  FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.small_groups ADD CONSTRAINT fk_logistics_assistant
  FOREIGN KEY (logistics_assistant_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.small_groups ADD CONSTRAINT fk_finance_assistant
  FOREIGN KEY (finance_assistant_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. TABLE `members`
-- Contient les membres généraux de l'AYLF.
CREATE TABLE public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  -- AJOUTS v1.1: Champs pour plus de détails sur les membres
  gender text,
  phone text,
  email text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Lien vers un compte utilisateur si existant (je ne vois pas l'interet de lier un membre simple a un utilisateur de l'application )
  type text, -- 'student' or 'non-student'
  join_date date,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  small_group_id uuid REFERENCES public.small_groups(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 6. TABLE `activities`
-- Contient toutes les activités planifiées, exécutées ou annulées.
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  date timestamptz,
  status text,
  level text,
  activity_type_id uuid REFERENCES public.activity_types(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  small_group_id uuid REFERENCES public.small_groups(id) ON DELETE SET NULL,
  participants_count integer,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- 7. TABLE `reports`
-- Contient tous les rapports soumis par les utilisateurs.
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  activity_date date,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  level text,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  small_group_id uuid REFERENCES public.small_groups(id) ON DELETE SET NULL,
  activity_type_id uuid REFERENCES public.activity_types(id) ON DELETE SET NULL,
  thematic text,
  speaker text,
  moderator text,
  girls_count integer,
  boys_count integer,
  participants_count_reported integer,
  amount_used numeric,
  currency text,
  content text,
  financial_summary text,
  images jsonb, -- Peut contenir des URLs d'images et d'autres pièces jointes
  status text DEFAULT 'submitted'::text,
  review_notes text,
  created_at timestamptz DEFAULT now()
);

-- 8. TABLE `fund_allocations`
-- Trace les transferts de fonds (National -> Site, Site -> SG).
CREATE TABLE public.fund_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount numeric NOT NULL,
  allocation_date date NOT NULL,
  description text,
  level text NOT NULL, -- 'national_to_site' or 'site_to_sg'
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  recipient_small_group_id uuid REFERENCES public.small_groups(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chk_recipient CHECK (
    (recipient_site_id IS NOT NULL AND recipient_small_group_id IS NULL) OR
    (recipient_site_id IS NULL AND recipient_small_group_id IS NOT NULL)
  )
);

-- 9. NOUVELLE TABLE v1.1: `transactions`
-- Trace les opérations financières (revenus/dépenses) au sein d'une entité.
CREATE TABLE public.transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL, -- 'income' or 'expense'
    category text,
    amount numeric NOT NULL,
    date timestamptz NOT NULL,
    description text,
    site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
    small_group_id uuid REFERENCES public.small_groups(id) ON DELETE SET NULL,
    recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT chk_entity CHECK (
        (site_id IS NOT NULL AND small_group_id IS NULL) OR
        (site_id IS NULL AND small_group_id IS NOT NULL) OR
        (site_id IS NULL AND small_group_id IS NULL) -- Pour le niveau national
    )
);


-- =============================================================================
-- FONCTIONS, DÉCLENCHEURS ET POLITIQUES (RLS)
-- =============================================================================

-- FONCTIONS D'AIDE POUR LES POLITIQUES DE SÉCURITÉ
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_site_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT site_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_small_group_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT small_group_id FROM public.profiles WHERE id = auth.uid();
$$;

-- FONCTION ET DÉCLENCHEUR (TRIGGER) POUR CRÉER AUTOMATIQUEMENT LES PROFILS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'role',
    'active',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Ce déclencheur appelle la fonction `handle_new_user` après chaque création d'utilisateur.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Activation de la Row Level Security (RLS) pour toutes les tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.small_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY; -- NOUVEAU

-- POLITIQUES DE SÉCURITÉ

-- `profiles` table
CREATE POLICY "Les utilisateurs peuvent voir et modifier leur propre profil."
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Les coordinateurs nationaux peuvent tout faire sur les profils."
  ON public.profiles FOR ALL
  USING (get_my_role() = 'national_coordinator')
  WITH CHECK (get_my_role() = 'national_coordinator');
CREATE POLICY "Les utilisateurs authentifiés peuvent voir les profils des autres."
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');


-- `sites` and `small_groups` tables
CREATE POLICY "Tout utilisateur authentifié peut voir les sites et les petits groupes."
  ON public.sites FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Tout utilisateur authentifié peut voir les petits groupes."
  ON public.small_groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Les coordinateurs nationaux peuvent gérer les sites."
  ON public.sites FOR ALL
  USING (get_my_role() = 'national_coordinator');
CREATE POLICY "Les coordinateurs de site peuvent gérer les petits groupes de leur site."
  ON public.small_groups FOR ALL
  USING (get_my_role() = 'national_coordinator' OR (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()));
  
-- `activity_types` table
CREATE POLICY "Tout utilisateur authentifié peut voir les types d'activités."
  ON public.activity_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Les coordinateurs nationaux peuvent gérer les types d'activités."
  ON public.activity_types FOR ALL
  USING (get_my_role() = 'national_coordinator');

-- `activities`, `reports`, `members`, `transactions` tables
CREATE POLICY "Les utilisateurs peuvent voir les données selon leur niveau."
  ON public.activities FOR SELECT
  USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  );
CREATE POLICY "Les utilisateurs peuvent créer des données selon leur niveau."
  ON public.activities FOR INSERT
  WITH CHECK (
    (level = 'national' AND get_my_role() = 'national_coordinator') OR
    (level = 'site' AND get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (level = 'small_group' AND get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  );
-- Répétez des politiques similaires pour les autres tables
CREATE POLICY "Les utilisateurs peuvent voir les rapports selon leur niveau."
  ON public.reports FOR SELECT
  USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  );
CREATE POLICY "Les utilisateurs peuvent soumettre et gérer leurs propres rapports."
  ON public.reports FOR ALL
  USING (submitted_by = auth.uid())
  WITH CHECK (submitted_by = auth.uid());
  
CREATE POLICY "Les coordinateurs nationaux peuvent gérer tous les rapports."
  ON public.reports FOR ALL
  USING (get_my_role() = 'national_coordinator');

-- `fund_allocations` table
CREATE POLICY "Les coordinateurs peuvent voir les allocations qui les concernent."
  ON public.fund_allocations FOR SELECT
  USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND recipient_site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND recipient_small_group_id = get_my_small_group_id())
  );
CREATE POLICY "Les coordinateurs peuvent créer des allocations pour leur niveau."
  ON public.fund_allocations FOR INSERT
  WITH CHECK (
    (level = 'national_to_site' AND get_my_role() = 'national_coordinator' AND sender_id = auth.uid()) OR
    (level = 'site_to_sg' AND get_my_role() = 'site_coordinator' AND sender_id = auth.uid())
  );

-- `transactions` table (NOUVEAU)
CREATE POLICY "Les utilisateurs peuvent voir les transactions de leur périmètre."
  ON public.transactions FOR SELECT
  USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  );
CREATE POLICY "Les utilisateurs peuvent enregistrer des transactions pour leur périmètre."
  ON public.transactions FOR INSERT
  WITH CHECK (recorded_by = auth.uid());
