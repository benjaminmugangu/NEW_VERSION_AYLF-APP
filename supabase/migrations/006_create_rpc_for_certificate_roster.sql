-- supabase/migrations/006_create_rpc_for_certificate_roster.sql

CREATE OR REPLACE FUNCTION get_certificate_roster(start_date_filter date DEFAULT NULL, end_date_filter date DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    name text,
    email text,
    avatar_url text,
    role text,
    site_id uuid,
    small_group_id uuid,
    mandate_start_date timestamptz,
    mandate_end_date timestamptz,
    status text,
    created_at timestamptz,
    entityName text,
    roleDisplayName text,
    mandateStatus text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security check: Only national coordinators can run this function.
        IF get_my_role() <> 'national_coordinator' THEN
        RAISE EXCEPTION 'Access denied: You must be a national coordinator to perform this action.';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.email,
        p.avatar_url,
        p.role,
        p.site_id,
        p.small_group_id,
        p.mandate_start_date,
        p.mandate_end_date,
        p.status,
        p.created_at,
        CASE
            WHEN p.role = 'NATIONAL_COORDINATOR' THEN 'National'
            WHEN p.role = 'SITE_COORDINATOR' THEN s.name
            WHEN p.role = 'SMALL_GROUP_LEADER' THEN sg.name || ' (' || s_for_sg.name || ')'
            ELSE 'N/A'
        END AS "entityName",
        REPLACE(INITCAP(REPLACE(p.role, '_', ' ')), 'Sg', 'SG') AS "roleDisplayName",
        CASE
            WHEN p.mandate_end_date IS NULL THEN 'Active'
            ELSE 'Past'
        END AS "mandateStatus"
    FROM
        public.profiles p
    LEFT JOIN
        public.sites s ON p.site_id = s.id
    LEFT JOIN
        public.small_groups sg ON p.small_group_id = sg.id
    LEFT JOIN
        public.sites s_for_sg ON sg.site_id = s_for_sg.id
    WHERE
        p.role IN ('NATIONAL_COORDINATOR', 'SITE_COORDINATOR', 'SMALL_GROUP_LEADER')
        AND p.mandate_start_date IS NOT NULL
        AND (
            (start_date_filter IS NULL AND end_date_filter IS NULL) OR
            (tstzrange(p.mandate_start_date, p.mandate_end_date, '[]') && tstzrange(start_date_filter::timestamptz, end_date_filter::timestamptz, '[]'))
        )
    ORDER BY
        "mandateStatus" ASC, p.mandate_start_date DESC;
END;
$$;
