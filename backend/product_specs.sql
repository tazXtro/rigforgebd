-- =====================================================
-- RigForgeBD Product Specifications Table
-- =====================================================
-- Run this in your Supabase SQL Editor after products.sql

-- =====================================================
-- PRODUCT_SPECS TABLE
-- =====================================================
-- Stores detailed product specifications in JSONB format
-- Allows flexible, searchable specs that vary by category

CREATE TABLE IF NOT EXISTS product_specs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    specs JSONB NOT NULL DEFAULT '{}',
    raw_html TEXT,  -- Optional: store raw specs HTML for reprocessing
    source_url TEXT,  -- URL where specs were scraped from
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
-- Index for efficient product lookup
CREATE INDEX IF NOT EXISTS idx_product_specs_product_id ON product_specs(product_id);

-- GIN index for JSONB specs querying (e.g., find products by spec values)
CREATE INDEX IF NOT EXISTS idx_product_specs_specs ON product_specs USING gin(specs);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
-- Reuse the update_updated_at_column function from products.sql
DROP TRIGGER IF EXISTS update_product_specs_updated_at ON product_specs;
CREATE TRIGGER update_product_specs_updated_at
    BEFORE UPDATE ON product_specs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE product_specs ENABLE ROW LEVEL SECURITY;

-- Allow public read access (same pattern as products table)
CREATE POLICY "Allow public read access on product_specs" 
    ON product_specs FOR SELECT 
    USING (true);

-- Allow authenticated insert/update (for scraper service)
CREATE POLICY "Allow authenticated insert on product_specs" 
    ON product_specs FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on product_specs" 
    ON product_specs FOR UPDATE 
    USING (true);
