// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// Assurez-vous que vos variables d'environnement sont bien définies dans votre fichier .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

// Crée un client Supabase destiné à être utilisé côté serveur (API routes, server actions)
// Ce client utilise la clé de service et peut contourner les politiques de Row Level Security (RLS).
// À n'utiliser que dans des contextes sécurisés côté serveur !
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
