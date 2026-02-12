-- ============================================================================
-- SUPABASE DATABASE SCHEMA FIXES
-- Run these SQL commands in your Supabase SQL Editor
-- ============================================================================

-- PART 1: Fix users table (for avatar sync and blocking)
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- PART 2: Fix company_settings table
-- ============================================================================
-- First, check what columns exist
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'company_settings';

-- Add missing columns if they don't exist (safe to run multiple times)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS notifications_push BOOLEAN DEFAULT true;

-- If the table had camelCase columns, we need to migrate the data
-- This will copy data from camelCase to snake_case if they exist
DO $$
BEGIN
    -- Check if camelCase columns exist and migrate data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'companyName') THEN
        UPDATE company_settings SET company_name = "companyName" WHERE company_name IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'dateFormat') THEN
        UPDATE company_settings SET date_format = "dateFormat" WHERE date_format IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'notificationsEmail') THEN
        UPDATE company_settings SET notifications_email = "notificationsEmail" WHERE notifications_email IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'notificationsPush') THEN
        UPDATE company_settings SET notifications_push = "notificationsPush" WHERE notifications_push IS NULL;
    END IF;
END $$;

-- Insert default row if table is empty
INSERT INTO company_settings (
    company_name,
    logo,
    address,
    phone,
    email,
    website,
    currency,
    date_format,
    theme,
    notifications_email,
    notifications_push
)
SELECT 
    'Your Company Name',
    NULL,
    '',
    '',
    '',
    '',
    'USD',
    'MM/DD/YYYY',
    'light',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);

-- PART 3: Set up Row Level Security (if not already enabled)
-- ============================================================================
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read company settings" ON company_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update company settings" ON company_settings;

-- Create policies
CREATE POLICY "Allow authenticated users to read company settings"
ON company_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to update company settings"
ON company_settings FOR UPDATE
TO authenticated
USING (true);

-- PART 4: Verify the schema
-- ============================================================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'company_settings'
ORDER BY ordinal_position;
