
import { createClient } from '@supabase/supabase-js';

console.log('Loading Supabase configuration...');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

// Create Supabase client only if environment variables are present
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (supabase) {
  console.log('Supabase client created successfully');
} else {
  console.warn('Supabase client not created - missing environment variables');
  console.warn('App will run in demo mode without backend functionality');
}
