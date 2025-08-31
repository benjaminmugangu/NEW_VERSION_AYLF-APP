-- =============================================================================
-- AYLF GROUP TRACKER - DATABASE SCHEMA
-- Version: 1.2
-- Description: Schéma complet pour la base de données Supabase, incluant les
-- tables, relations, fonctions, déclencheurs et politiques de sécurité (RLS).
-- Changelog:
-- v1.2: Nettoyage du schéma, suppression des tables dupliquées, ajout du
--       soft delete pour les activités.
-- v1.1: Ajout des tables `transactions` et `fund_allocations`, RLS, etc.
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
  city text,
  country text,
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
  gender text,
  phone text,
  email text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
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
  responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz -- Pour le soft delete
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
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  content jsonb, -- Structure flexible pour le contenu du rapport
  participants_count integer,
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
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chk_level_and_recipient CHECK (
    (level = 'national_to_site' AND recipient_site_id IS NOT NULL AND recipient_small_group_id IS NULL) OR
    (level = 'site_to_sg' AND recipient_site_id IS NULL AND recipient_small_group_id IS NOT NULL)
  )
);

-- 9. TABLE `transactions`
-- Trace les opérations financières (revenus/dépenses) au sein d'une entité.
CREATE TABLE public.transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL, -- 'income' or 'expense'
    category text,
    amount numeric NOT NULL,
    date timestamptz NOT NULL,
    description text,
    recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
    small_group_id uuid REFERENCES public.small_groups(id) ON DELETE SET NULL,
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

-- DÉCLENCHEUR POUR SYNCHRONISER `profiles` AVEC `auth.users`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'role');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- FONCTION POUR LES STATISTIQUES DU TABLEAU DE BORD (ADMIN)
-- =============================================================================
-- Cette fonction est appelée côté serveur avec les droits d'administrateur
-- pour agréger les statistiques du tableau de bord.

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    from_date text DEFAULT NULL,
    to_date text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    start_ts timestamptz;
    end_ts timestamptz;
    stats json;
    total_sites_count int;
    total_small_groups_count int;
    total_members_count int;
    total_activities_count int;
    total_reports_count int;
    total_income_val numeric;
    total_expenses_val numeric;
    balance_val numeric;
BEGIN
    -- Convertir les dates text en timestamptz.
    -- Si NULL, utilise une plage très large pour signifier "tout le temps".
    start_ts := COALESCE(from_date::timestamptz, '1970-01-01'::timestamptz);
    end_ts := COALESCE(to_date::timestamptz, '2999-12-31'::timestamptz);

    -- Statistiques non filtrées par date
    SELECT count(*) INTO total_sites_count FROM sites;
    SELECT count(*) INTO total_small_groups_count FROM small_groups;

    -- Statistiques filtrées par la plage de dates
    SELECT count(*) INTO total_members_count FROM members WHERE join_date >= start_ts::date AND join_date <= end_ts::date;
    SELECT count(*) INTO total_activities_count FROM activities WHERE date >= start_ts AND date <= end_ts AND deleted_at IS NULL;
    SELECT count(*) INTO total_reports_count FROM reports WHERE activity_date >= start_ts::date AND activity_date <= end_ts::date;

    -- Finances filtrées par la plage de dates
    SELECT COALESCE(sum(amount), 0) INTO total_income_val FROM transactions WHERE type = 'income' AND date >= start_ts AND date <= end_ts;
    SELECT COALESCE(sum(amount), 0) INTO total_expenses_val FROM transactions WHERE type = 'expense' AND date >= start_ts AND date <= end_ts;
    
    balance_val := total_income_val - total_expenses_val;

    -- Construction de l'objet JSON de retour
    stats := json_build_object(
        'totalSites', total_sites_count,
        'totalSmallGroups', total_small_groups_count,
        'totalMembers', total_members_count,
        'totalActivities', total_activities_count,
        'totalReports', total_reports_count,
        'totalIncome', total_income_val,
        'totalExpenses', total_expenses_val,
        'balance', balance_val
    );

    RETURN stats;
END;
$$;
