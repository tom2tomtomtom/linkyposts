
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kwxaqyxwwmpytiawjgjm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eGFxeXh3d21weXRpYXdqZ2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1NDQ4NzUsImV4cCI6MjA1NjEyMDg3NX0.6UhU4YFNvytTJn9HHC0BO3vh0BV6Pg3a4VHUuOanDBc";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
