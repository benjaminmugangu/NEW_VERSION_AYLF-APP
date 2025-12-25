-- RLS Policies for notifications table

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (get_my_id() = user_id::TEXT);

-- 2. Users can update their own notifications (e.g. mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (get_my_id() = user_id::TEXT);

-- 3. Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (get_my_id() = user_id::TEXT);

-- 4. National Coordinators can view all (optional, for debugging)
CREATE POLICY "National Coordinators can view all notifications" ON public.notifications
  FOR SELECT USING (get_my_role() = 'NATIONAL_COORDINATOR');
