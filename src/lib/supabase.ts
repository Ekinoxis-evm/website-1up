import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public read client (anon key) — for Server Components
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Admin client (service role) — for API routes that mutate data
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
