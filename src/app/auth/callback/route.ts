import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Check if this is a new user accepting an invitation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // If no profile exists or profile is incomplete, create/update it with invitation data
      if (profileError || !profile) {
        const userData = data.user.user_metadata;
        
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            name: userData.full_name || data.user.email?.split('@')[0] || 'User',
            role: userData.role || 'small_group_leader',
            site_id: userData.site_id || null,
            small_group_id: userData.small_group_id || null,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        // Redirect new users to setup page to complete their profile
        return NextResponse.redirect(`${origin}/auth/setup`);
      }

      // Existing users go to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
