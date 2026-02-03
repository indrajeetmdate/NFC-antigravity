import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

/**
 * Supabase Client - Single Static Instance
 * 
 * INVARIANTS:
 * 1. Client is created once at module load
 * 2. Never recreated on visibility or auth events
 * 3. All database/auth operations use this single instance
 */

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Backwards compatibility alias
export const getSupabase = () => supabase;

/*
-- ===============================================================================================
-- !! DATABASE UPDATE REQUIRED !!
-- ===============================================================================================
-- If your Profile is not saving, you are likely missing these columns.
-- Run this in Supabase SQL Editor:

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_elements jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_button_url text DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_button_style jsonb DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS design_data jsonb DEFAULT '{}'::jsonb;

-- ===============================================================================================
*/
