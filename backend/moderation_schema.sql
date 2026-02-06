-- ========================================
-- MODERATION FEATURE DATABASE SCHEMA
-- ========================================
-- Run this in your Supabase SQL Editor

-- ----------------------------------------
-- 1. ADD APPROVAL STATUS TO BUILDS
-- ----------------------------------------

-- Add approval_status column to builds table
ALTER TABLE builds ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add rejection_reason column (nullable, only used when rejected)
ALTER TABLE builds ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add reviewed_at timestamp
ALTER TABLE builds ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add reviewed_by (admin who reviewed)
ALTER TABLE builds ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

-- Create index for approval status filtering
CREATE INDEX IF NOT EXISTS idx_builds_approval_status ON builds(approval_status);

-- ----------------------------------------
-- 2. UPDATE RLS POLICIES FOR BUILDS
-- ----------------------------------------

-- Drop existing select policy
DROP POLICY IF EXISTS "Builds are viewable by everyone" ON builds;

-- Create new policy: Public can only see approved builds
CREATE POLICY "Approved builds are viewable by everyone" 
    ON builds FOR SELECT 
    USING (
        approval_status = 'approved' 
        OR auth.uid()::text = author_id::text  -- Authors can see their own builds
        OR auth.role() = 'service_role'  -- Service role can see all
    );

-- ----------------------------------------
-- 3. USER SANCTIONS TABLE
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS user_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sanction_type VARCHAR(20) NOT NULL CHECK (sanction_type IN ('timeout', 'permanent_ban')),
    reason TEXT,
    duration_days INTEGER,  -- NULL for permanent ban
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,  -- NULL for permanent ban
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Index for quick lookups
    CONSTRAINT valid_timeout CHECK (
        (sanction_type = 'permanent_ban' AND duration_days IS NULL AND expires_at IS NULL)
        OR (sanction_type = 'timeout' AND duration_days IS NOT NULL AND expires_at IS NOT NULL)
    )
);

-- Indexes for user_sanctions
CREATE INDEX IF NOT EXISTS idx_user_sanctions_user_id ON user_sanctions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sanctions_is_active ON user_sanctions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sanctions_expires_at ON user_sanctions(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE user_sanctions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sanctions
-- Only admins (service_role) can manage sanctions
CREATE POLICY "Sanctions are viewable by service role" 
    ON user_sanctions FOR SELECT 
    USING (auth.role() = 'service_role');

CREATE POLICY "Sanctions are insertable by service role" 
    ON user_sanctions FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Sanctions are updatable by service role" 
    ON user_sanctions FOR UPDATE 
    USING (auth.role() = 'service_role');

CREATE POLICY "Sanctions are deletable by service role" 
    ON user_sanctions FOR DELETE 
    USING (auth.role() = 'service_role');

-- ----------------------------------------
-- 4. FUNCTION TO CHECK IF USER IS SANCTIONED
-- ----------------------------------------
CREATE OR REPLACE FUNCTION is_user_sanctioned(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_sanctions
        WHERE user_id = check_user_id
          AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 5. FUNCTION TO AUTO-DEACTIVATE EXPIRED SANCTIONS
-- ----------------------------------------
CREATE OR REPLACE FUNCTION deactivate_expired_sanctions()
RETURNS void AS $$
BEGIN
    UPDATE user_sanctions
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 6. VIEW FOR PENDING BUILDS COUNT (for admin dashboard)
-- ----------------------------------------
CREATE OR REPLACE VIEW pending_builds_count AS
SELECT COUNT(*) as count
FROM builds
WHERE approval_status = 'pending';

-- Grant access to the view
GRANT SELECT ON pending_builds_count TO authenticated;
GRANT SELECT ON pending_builds_count TO service_role;
