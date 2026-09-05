/**
 * Supabase Client — Singleton
 * 
 * Provides a shared Supabase client for Realtime Presence.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
