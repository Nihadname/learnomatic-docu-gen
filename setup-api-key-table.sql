-- This file contains SQL commands to set up the API key table in Supabase
-- Run these commands in the SQL Editor in your Supabase dashboard

-- Create the keys table
CREATE TABLE IF NOT EXISTS public.keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_value TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    description TEXT
);

-- Set up RLS (Row Level Security) to secure access to API keys
-- Only allow signed in users to read keys, but NOT insert/update/delete them
ALTER TABLE public.keys ENABLE ROW LEVEL SECURITY;

-- Allow read access only to authenticated users
CREATE POLICY "Allow authenticated users to read keys" 
  ON public.keys
  FOR SELECT 
  TO authenticated
  USING (true);

-- Instructions for adding your API key:
-- 1. Open the Supabase dashboard for your project
-- 2. Go to Table Editor
-- 3. Select the 'keys' table
-- 4. Click "Insert row"
-- 5. Fill in the key_value field with your OpenAI API key (e.g., 'sk-...')
-- 6. Optionally add a description (e.g., 'OpenAI API Key')
-- 7. Click "Save"

-- Example insert statement (you can use this in the SQL Editor):
-- INSERT INTO public.keys (key_value, description) 
-- VALUES ('sk-your-openai-api-key-here', 'OpenAI API Key'); 