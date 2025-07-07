/**
 * 🔒 SUPABASE CLIENT - LEGACY FILE
 * 
 * ⚠️ DEPRECATED: This file is kept for backward compatibility only.
 * 🔄 MIGRATE TO: Use @/lib/supabase/secureClient instead for new code.
 * 
 * 🛡️ SECURITY STATUS:
 * ✅ Uses anon key (safe for client-side)
 * ✅ Protected by Row Level Security (RLS) policies
 * ✅ All operations are user-bound via RLS
 * 
 * 📋 RLS POLICIES ACTIVE:
 * - Users can only access their own data (user_id = auth.uid())
 * - All tables have proper RLS policies enabled
 * - No sensitive operations exposed to client
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ✅ SAFE: Client-side environment variables (anon key is safe to expose)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('🚨 Missing Supabase environment variables. Please check your .env file.');
}

/**
 * 🌐 LEGACY SUPABASE CLIENT
 * 
 * ✅ SAFE OPERATIONS (All protected by RLS):
 * - Authentication (signIn, signUp, signOut)
 * - User data access (automatically filtered by RLS policies)
 * - Database operations (user can only access their own data)
 * 
 * 🔄 TODO: Gradually migrate to secure client helpers
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});