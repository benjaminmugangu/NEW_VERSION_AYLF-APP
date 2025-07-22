DROP FUNCTION IF EXISTS get_users_with_details();

CREATE OR REPLACE FUNCTION get_users_with_details()
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  name text,
  email text,
  role text,
  status text,
  site_id uuid,
  small_group_id uuid,
  avatar_url text,
  assignment text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.created_at,
    p.name,
    p.email,
    p.role,
    p.status,
    p.site_id,
    p.small_group_id,
    p.avatar_url,
    CASE
      WHEN p.role = 'site_coordinator' AND s.name IS NOT NULL THEN s.name
      WHEN p.role = 'small_group_leader' AND sg.name IS NOT NULL THEN sg.name || ' (' || COALESCE(s_sg.name, 'Unknown Site') || ')'
      ELSE 'N/A'
    END AS assignment
  FROM
    profiles p
  LEFT JOIN
    sites s ON p.site_id = s.id
  LEFT JOIN
    small_groups sg ON p.small_group_id = sg.id
  LEFT JOIN
    sites s_sg ON sg.site_id = s_sg.id;
END;
$$;

-- =============================================================================
-- FUNCTION: delete_user_permanently
-- DESCRIPTION: Supprime définitivement un utilisateur de auth.users et, par
--              cascade, de public.profiles. Requiert des privilèges élevés.
-- =============================================================================
CREATE OR REPLACE FUNCTION delete_user_permanently(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- D'abord, supprimer le profil pour satisfaire la contrainte de clé étrangère.
  -- Cela suppose qu'aucune autre table ne bloque la suppression.
  DELETE FROM public.profiles WHERE id = user_id;

  -- Ensuite, supprimer l'utilisateur du système d'authentification.
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
