-- ========================================
-- BUILDS FEATURE DATABASE SCHEMA
-- ========================================
-- Run this in your Supabase SQL Editor

-- ----------------------------------------
-- 1. UPDATE USERS TABLE - Add username
-- ----------------------------------------
-- Add username column to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ----------------------------------------
-- 2. BUILDS TABLE
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    build_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Author reference
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Build configuration (stored as JSONB for flexibility)
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Settings
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    comments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Cached counts (denormalized for performance)
    upvotes_count INTEGER NOT NULL DEFAULT 0,
    downvotes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0
);

-- Indexes for builds
CREATE INDEX idx_builds_author_id ON builds(author_id);
CREATE INDEX idx_builds_created_at ON builds(created_at DESC);
CREATE INDEX idx_builds_is_featured ON builds(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_builds_total_price ON builds(total_price);

-- Enable RLS
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for builds
-- Anyone can read builds
CREATE POLICY "Builds are viewable by everyone" 
    ON builds FOR SELECT 
    USING (true);

-- Only author can insert their own builds
CREATE POLICY "Users can create their own builds" 
    ON builds FOR INSERT 
    WITH CHECK (auth.uid()::text = author_id::text OR auth.role() = 'service_role');

-- Only author can update their own builds
CREATE POLICY "Users can update their own builds" 
    ON builds FOR UPDATE 
    USING (auth.uid()::text = author_id::text OR auth.role() = 'service_role');

-- Only author can delete their own builds
CREATE POLICY "Users can delete their own builds" 
    ON builds FOR DELETE 
    USING (auth.uid()::text = author_id::text OR auth.role() = 'service_role');

-- ----------------------------------------
-- 3. BUILD VOTES TABLE
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS build_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One vote per user per build
    UNIQUE(build_id, user_id)
);

-- Indexes for votes
CREATE INDEX idx_build_votes_build_id ON build_votes(build_id);
CREATE INDEX idx_build_votes_user_id ON build_votes(user_id);

-- Enable RLS
ALTER TABLE build_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for votes
CREATE POLICY "Votes are viewable by everyone" 
    ON build_votes FOR SELECT 
    USING (true);

CREATE POLICY "Users can create their own votes" 
    ON build_votes FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own votes" 
    ON build_votes FOR UPDATE 
    USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

CREATE POLICY "Users can delete their own votes" 
    ON build_votes FOR DELETE 
    USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

-- ----------------------------------------
-- 4. BUILD COMMENTS TABLE
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS build_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX idx_build_comments_build_id ON build_comments(build_id);
CREATE INDEX idx_build_comments_author_id ON build_comments(author_id);
CREATE INDEX idx_build_comments_created_at ON build_comments(created_at DESC);

-- Enable RLS
ALTER TABLE build_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone" 
    ON build_comments FOR SELECT 
    USING (true);

CREATE POLICY "Users can create their own comments" 
    ON build_comments FOR INSERT 
    WITH CHECK (auth.uid()::text = author_id::text OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own comments" 
    ON build_comments FOR UPDATE 
    USING (auth.uid()::text = author_id::text OR auth.role() = 'service_role');

CREATE POLICY "Users can delete their own comments" 
    ON build_comments FOR DELETE 
    USING (auth.uid()::text = author_id::text OR auth.role() = 'service_role');

-- ----------------------------------------
-- 5. TRIGGERS FOR VOTE COUNT UPDATES
-- ----------------------------------------

-- Function to update vote counts
CREATE OR REPLACE FUNCTION update_build_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE builds SET
            upvotes_count = upvotes_count + CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE 0 END,
            downvotes_count = downvotes_count + CASE WHEN NEW.vote_type = 'downvote' THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = NEW.build_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE builds SET
            upvotes_count = upvotes_count 
                - CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE 0 END
                + CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE 0 END,
            downvotes_count = downvotes_count 
                - CASE WHEN OLD.vote_type = 'downvote' THEN 1 ELSE 0 END
                + CASE WHEN NEW.vote_type = 'downvote' THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = NEW.build_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE builds SET
            upvotes_count = upvotes_count - CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE 0 END,
            downvotes_count = downvotes_count - CASE WHEN OLD.vote_type = 'downvote' THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = OLD.build_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote count updates
DROP TRIGGER IF EXISTS trigger_update_build_vote_counts ON build_votes;
CREATE TRIGGER trigger_update_build_vote_counts
    AFTER INSERT OR UPDATE OR DELETE ON build_votes
    FOR EACH ROW EXECUTE FUNCTION update_build_vote_counts();

-- ----------------------------------------
-- 6. TRIGGER FOR COMMENT COUNT UPDATES
-- ----------------------------------------

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_build_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE builds SET
            comments_count = comments_count + 1,
            updated_at = NOW()
        WHERE id = NEW.build_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE builds SET
            comments_count = comments_count - 1,
            updated_at = NOW()
        WHERE id = OLD.build_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment count updates
DROP TRIGGER IF EXISTS trigger_update_build_comment_count ON build_comments;
CREATE TRIGGER trigger_update_build_comment_count
    AFTER INSERT OR DELETE ON build_comments
    FOR EACH ROW EXECUTE FUNCTION update_build_comment_count();

-- ----------------------------------------
-- 7. UPDATED_AT TRIGGER
-- ----------------------------------------

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_builds_updated_at ON builds;
CREATE TRIGGER trigger_builds_updated_at
    BEFORE UPDATE ON builds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_build_comments_updated_at ON build_comments;
CREATE TRIGGER trigger_build_comments_updated_at
    BEFORE UPDATE ON build_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Also add trigger to users table if not exists
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
