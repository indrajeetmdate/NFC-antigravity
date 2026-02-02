
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

/**
 * Supabase Client Factory
 * 
 * Provides a singleton Supabase client with the ability to recreate it
 * after browser tab suspension. This is necessary because:
 * 1. WebSocket connections become stale when tabs are backgrounded
 * 2. Refresh token reuse detection can reject old tokens
 * 3. The client must rehydrate session from localStorage on recreation
 */

let supabaseInstance: SupabaseClient | null = null;
let instanceVersion = 0;

// Callbacks to notify when client is recreated
const recreationCallbacks: Set<(client: SupabaseClient) => void> = new Set();

/**
 * Create a new Supabase client instance with proper configuration
 */
function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Get the current active Supabase client.
 * All database/auth operations should use this getter.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
    console.log('[Supabase] Created initial client instance');
  }
  return supabaseInstance;
}

/**
 * Get the current instance version (increments on recreation)
 * Used to detect if a component is holding a stale reference
 */
export function getSupabaseVersion(): number {
  return instanceVersion;
}

/**
 * Register a callback to be notified when the client is recreated.
 * Use this to re-subscribe to realtime channels or auth state changes.
 */
export function onSupabaseRecreated(callback: (client: SupabaseClient) => void): () => void {
  recreationCallbacks.add(callback);
  return () => recreationCallbacks.delete(callback);
}

/**
 * Recreate the Supabase client after tab suspension.
 * 
 * This is the key function for tab recovery:
 * 1. Removes all stale realtime channels
 * 2. Creates a fresh client instance
 * 3. Lets the new client rehydrate session from localStorage (NOT refreshSession!)
 * 4. Notifies all registered callbacks to re-subscribe
 * 
 * IMPORTANT: Do NOT call refreshSession() here - Supabase has refresh token
 * reuse detection that can reject tokens after tab suspension. The new client
 * will automatically rehydrate the session from localStorage.
 */
export async function recreateSupabase(): Promise<SupabaseClient> {
  console.log('[Supabase] Recreating client after tab suspension...');

  // Step 1: Clean up old client if exists
  if (supabaseInstance) {
    try {
      // Remove all realtime channels to clean up dead WebSocket connections
      const channels = supabaseInstance.getChannels();
      console.log(`[Supabase] Removing ${channels.length} stale channels`);
      await supabaseInstance.removeAllChannels();
    } catch (err) {
      console.warn('[Supabase] Error cleaning up old channels:', err);
    }
  }

  // Step 2: Create fresh client (will rehydrate from localStorage automatically)
  supabaseInstance = createSupabaseClient();
  instanceVersion++;

  console.log(`[Supabase] Created new client instance (version ${instanceVersion})`);

  // Step 3: Notify all registered callbacks to re-subscribe
  recreationCallbacks.forEach(callback => {
    try {
      callback(supabaseInstance!);
    } catch (err) {
      console.error('[Supabase] Error in recreation callback:', err);
    }
  });

  return supabaseInstance;
}

/**
 * Reset realtime channels without full client recreation.
 * Use when you just need to clean up channels.
 */
export async function resetRealtimeChannels(): Promise<void> {
  if (supabaseInstance) {
    const channels = supabaseInstance.getChannels();
    console.log(`[Supabase] Resetting ${channels.length} realtime channels`);
    await supabaseInstance.removeAllChannels();
  }
}

// For backward compatibility - components can import { supabase } directly
// But prefer getSupabase() for tab-safe operations
export const supabase = getSupabase();

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
