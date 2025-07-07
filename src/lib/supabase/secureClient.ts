import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * 🔒 SECURE SUPABASE CLIENT CONFIGURATION
 * 
 * This file provides secure Supabase client instances with proper separation of concerns:
 * - Client-side operations use anon key (safe for browser)
 * - Server-side operations should use service role key (server-only)
 */

// ✅ SAFE: Client-side Supabase client using anon key
// This key is safe to expose in the browser and is restricted by RLS policies
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

/**
 * 🌐 CLIENT-SIDE SUPABASE CLIENT
 * 
 * ✅ SAFE OPERATIONS (Protected by RLS):
 * - Authentication (signIn, signUp, signOut)
 * - Reading user's own data (SELECT with RLS)
 * - User-bound operations (INSERT/UPDATE/DELETE with user_id = auth.uid())
 * 
 * ⚠️ SECURITY NOTES:
 * - All operations are protected by Row Level Security (RLS) policies
 * - Users can only access their own data due to RLS policies
 * - anon key has limited permissions and cannot bypass RLS
 */
export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * 🛡️ SECURITY VALIDATION HELPERS
 */

/**
 * Validates that the current user is authenticated before database operations
 * @returns Promise<string> - User ID if authenticated
 * @throws Error if user is not authenticated
 */
export const requireAuth = async (): Promise<string> => {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  
  if (error || !user) {
    throw new Error('Authentication required. Please sign in to continue.');
  }
  
  return user.id;
};

/**
 * 🔍 SECURE QUERY BUILDERS
 * 
 * These functions provide additional security validation for common operations
 */

/**
 * Secure SELECT query builder - automatically filters by user_id
 * @param table - Table name
 * @param userId - User ID (optional, will use current user if not provided)
 */
export const secureSelect = async <T = any>(
  table: keyof Database['public']['Tables'],
  userId?: string
) => {
  const currentUserId = userId || await requireAuth();
  
  return supabaseClient
    .from(table)
    .select('*')
    .eq('user_id', currentUserId);
};

/**
 * Secure INSERT query builder - automatically adds user_id
 * @param table - Table name
 * @param data - Data to insert (user_id will be added automatically)
 */
export const secureInsert = async <T = any>(
  table: keyof Database['public']['Tables'],
  data: any
) => {
  const userId = await requireAuth();
  
  const dataWithUserId = {
    ...data,
    user_id: userId
  };
  
  return supabaseClient
    .from(table)
    .insert(dataWithUserId);
};

/**
 * Secure UPDATE query builder - automatically filters by user_id
 * @param table - Table name
 * @param data - Data to update
 * @param id - Record ID to update
 */
export const secureUpdate = async <T = any>(
  table: keyof Database['public']['Tables'],
  data: any,
  id: string
) => {
  const userId = await requireAuth();
  
  return supabaseClient
    .from(table)
    .update(data)
    .eq('id', id)
    .eq('user_id', userId); // Double security: filter by both ID and user_id
};

/**
 * Secure DELETE query builder - automatically filters by user_id
 * @param table - Table name
 * @param id - Record ID to delete
 */
export const secureDelete = async (
  table: keyof Database['public']['Tables'],
  id: string
) => {
  const userId = await requireAuth();
  
  return supabaseClient
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userId); // Double security: filter by both ID and user_id
};

/**
 * 📊 ANALYTICS & MONITORING
 */

/**
 * Log security-sensitive operations for monitoring
 * @param operation - Type of operation
 * @param table - Table name
 * @param details - Additional details
 */
export const logSecurityOperation = (
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  details?: any
) => {
  if (import.meta.env.DEV) {
    console.log('🔒 Supabase Security Operation:', {
      operation,
      table,
      timestamp: new Date().toISOString(),
      details
    });
  }
};

// Re-export the original client for backward compatibility
// TODO: Gradually migrate all direct usage to secure helpers
export const supabase = supabaseClient;

/**
 * 🚨 MIGRATION GUIDE
 * 
 * Replace direct supabase usage with secure helpers:
 * 
 * OLD:
 * const { data } = await supabase.from('classes').select('*').eq('user_id', userId);
 * 
 * NEW:
 * const { data } = await secureSelect('classes');
 * 
 * OLD:
 * await supabase.from('classes').insert({ name: 'Math', user_id: userId });
 * 
 * NEW:
 * await secureInsert('classes', { name: 'Math' });
 */ 