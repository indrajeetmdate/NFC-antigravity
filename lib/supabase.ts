
import { createClient, SupabaseClient, Subscription } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

/**
 * Supabase Client Factory - Single Instance Invariant
 * 
 * CRITICAL RULES:
 * 1. Only ONE live Supabase client instance exists at any time
 * 2. Old clients are fully decommissioned before creating new ones
 * 3. Auth listeners are tracked and removed on decommission
 * 4. Recreation only happens on actual lifecycle events (hidden→visible)
 */

// The singleton client instance
let supabaseInstance: SupabaseClient | null = null;
let instanceVersion = 0;

// Track all auth subscriptions for cleanup
const authSubscriptions: Set<Subscription> = new Set();

// Callbacks to notify when client is recreated
const recreationCallbacks: Set<(client: SupabaseClient) => void> = new Set();

// Lock to prevent concurrent recreation
let isRecreatingClient = false;

// Track if recreation is blocked (visible tab)
let recreationBlocked = false;

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
    // Disable realtime auto-connect to prevent WebSocket issues
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}

/**
 * Get the current active Supabase client.
 * All database/auth operations MUST use this getter.
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
 */
export function getSupabaseVersion(): number {
  return instanceVersion;
}

/**
 * Register an auth state change listener on the current client.
 * The subscription is tracked for proper cleanup on client recreation.
 * Returns an unsubscribe function.
 */
export function registerAuthListener(
  callback: Parameters<SupabaseClient['auth']['onAuthStateChange']>[0]
): () => void {
  const client = getSupabase();
  const { data: { subscription } } = client.auth.onAuthStateChange(callback);

  authSubscriptions.add(subscription);

  return () => {
    subscription.unsubscribe();
    authSubscriptions.delete(subscription);
  };
}

/**
 * Register a callback to be notified when the client is recreated.
 */
export function onSupabaseRecreated(callback: (client: SupabaseClient) => void): () => void {
  recreationCallbacks.add(callback);
  return () => recreationCallbacks.delete(callback);
}

/**
 * Block or unblock client recreation.
 * Call with true when tab is visible to prevent recreation during active use.
 */
export function setRecreationBlocked(blocked: boolean): void {
  recreationBlocked = blocked;
}

/**
 * Check if recreation is currently blocked
 */
export function isRecreationBlocked(): boolean {
  return recreationBlocked;
}

/**
 * Fully decommission the current client before recreation.
 * This ensures NO stale listeners or connections remain.
 */
async function decommissionClient(): Promise<void> {
  if (!supabaseInstance) return;

  console.log('[Supabase] Decommissioning old client...');

  // Step 1: Unsubscribe ALL tracked auth listeners
  console.log(`[Supabase] Removing ${authSubscriptions.size} auth subscriptions`);
  for (const subscription of authSubscriptions) {
    try {
      subscription.unsubscribe();
    } catch (err) {
      console.warn('[Supabase] Error unsubscribing auth listener:', err);
    }
  }
  authSubscriptions.clear();

  // Step 2: Remove all realtime channels
  try {
    const channels = supabaseInstance.getChannels();
    console.log(`[Supabase] Removing ${channels.length} realtime channels`);
    await supabaseInstance.removeAllChannels();
  } catch (err) {
    console.warn('[Supabase] Error removing channels:', err);
  }

  // Step 3: Sign out of GoTrue to clean up internal state (without clearing storage)
  // This prevents the "Multiple GoTrueClient instances" warning
  try {
    // Use local scope to avoid clearing session from localStorage
    await supabaseInstance.auth.signOut({ scope: 'local' });
  } catch (err) {
    // Ignore errors - we're decommissioning anyway
  }

  // Clear the reference
  supabaseInstance = null;
  console.log('[Supabase] Old client decommissioned');
}

/**
 * Recreate the Supabase client after returning from background.
 * 
 * CRITICAL: This should ONLY be called from lifecycle manager on
 * actual browser lifecycle events (hidden→visible transition).
 * 
 * Process:
 * 1. Check if recreation is blocked (tab visible)
 * 2. Acquire recreation lock (single-flight)
 * 3. Fully decommission old client
 * 4. Create fresh client
 * 5. Notify callbacks to re-subscribe
 */
export async function recreateSupabase(): Promise<SupabaseClient> {
  // Check if recreation is blocked (tab is visible)
  if (recreationBlocked) {
    console.warn('[Supabase] Recreation blocked - tab is visible');
    return getSupabase();
  }

  // Single-flight: prevent concurrent recreation
  if (isRecreatingClient) {
    console.log('[Supabase] Recreation already in progress, waiting...');
    // Wait for current recreation to complete
    while (isRecreatingClient) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return getSupabase();
  }

  isRecreatingClient = true;

  try {
    console.log('[Supabase] === RECREATING CLIENT ===');

    // Step 1: Fully decommission old client
    await decommissionClient();

    // Step 2: Create fresh client
    supabaseInstance = createSupabaseClient();
    instanceVersion++;

    console.log(`[Supabase] Created new client instance (version ${instanceVersion})`);

    // Step 3: Notify callbacks to re-register their auth listeners
    for (const callback of recreationCallbacks) {
      try {
        callback(supabaseInstance);
      } catch (err) {
        console.error('[Supabase] Error in recreation callback:', err);
      }
    }

    console.log('[Supabase] === CLIENT RECREATION COMPLETE ===');

    return supabaseInstance;

  } finally {
    isRecreatingClient = false;
  }
}

/**
 * Reset realtime channels without full client recreation.
 */
export async function resetRealtimeChannels(): Promise<void> {
  if (supabaseInstance) {
    const channels = supabaseInstance.getChannels();
    console.log(`[Supabase] Resetting ${channels.length} realtime channels`);
    await supabaseInstance.removeAllChannels();
  }
}

// REMOVED: The backward compatibility export that creates client on module load
// This was causing multiple GoTrueClient instances
// Use getSupabase() instead

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
