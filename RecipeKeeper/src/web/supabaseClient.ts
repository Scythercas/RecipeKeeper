import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY が未設定です。.env.example を参考に .env を作成してください。'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});
