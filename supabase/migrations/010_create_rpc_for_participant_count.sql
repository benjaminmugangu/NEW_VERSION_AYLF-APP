CREATE OR REPLACE FUNCTION get_participant_count(p_activity_id UUID)
RETURNS integer AS $$
DECLARE
  participant_count integer;
BEGIN
  SELECT count(*)
  INTO participant_count
  FROM public.activity_participants
  WHERE activity_id = p_activity_id;

  RETURN participant_count;
END;
$$ LANGUAGE plpgsql;
