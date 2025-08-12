require('dotenv').config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Make sure .env.local is set up.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkActivities() {
  console.log('Fetching activities from the database...');
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('id, title, created_at')
      .limit(5);

    if (error) {
      console.error('Error fetching activities:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No activities found.');
      return;
    }

    console.log('--- Found Activities ---');
    console.table(data);
    console.log('------------------------');

  } catch (err) {
    console.error('An unexpected error occurred:', err);
  }
}

checkActivities();
