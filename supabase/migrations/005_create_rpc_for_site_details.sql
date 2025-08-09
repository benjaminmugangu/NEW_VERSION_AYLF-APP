CREATE OR REPLACE FUNCTION get_small_groups_with_member_count_by_site(p_site_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  site_id UUID,
  leader_id UUID,
  meeting_day TEXT,
  meeting_time TIME WITH TIME ZONE,
  meeting_location TEXT,
  creation_date TIMESTAMPTZ,
  created_by UUID,
  logistics_assistant_id UUID,
  finance_assistant_id UUID,
  members_count BIGINT,
  leader_name TEXT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sg.id,
    sg.name,
    sg.site_id,
    sg.leader_id,
    sg.meeting_day,
    sg.meeting_time,
    sg.meeting_location,
    sg.creation_date,
    sg.created_by,
    sg.logistics_assistant_id,
    sg.finance_assistant_id,
    COUNT(p.id) AS members_count,
    l.name AS leader_name
  FROM
    small_groups sg
  LEFT JOIN
    profiles p ON sg.id = p.small_group_id
  LEFT JOIN
    profiles l ON sg.leader_id = l.id
  WHERE
    sg.site_id = p_site_id
  GROUP BY
    sg.id, l.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
