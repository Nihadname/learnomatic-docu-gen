// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://arijpbjvpefqyqxamkek.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyaWpwYmp2cGVmcXlxeGFta2VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NTEwMTIsImV4cCI6MjA1NzEyNzAxMn0.OEai75o9YE3V3eXyE2g1rNwpNFi_ty63IuLT5sb3nms";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);