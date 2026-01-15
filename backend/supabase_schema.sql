-- =====================================================
-- RigForgeBD Database Schema for Products and Scraping
-- =====================================================
-- Run this in your Supabase SQL Editor to create the tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. RETAILERS TABLE
-- =====================================================
-- Stores information about PC component retailers in Bangladesh

CREATE TABLE IF NOT EXISTS retailers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    base_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial retailers
INSERT INTO retailers (name, slug, base_url) VALUES
    ('Star Tech', 'startech', 'https://www.startech.com.bd'),
    ('Techland BD', 'techland', 'https://www.techlandbd.com'),
    ('Ryans Computers', 'ryans', 'https://www.ryanscomputers.com'),
    ('UltraTech', 'ultratech', 'https://www.ultratechbd.com'),
    ('Skyland', 'skyland', 'https://www.skyland.com.bd'),
    ('Nexus Computer', 'nexus', 'https://www.nexuscomputerbd.com')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 2. PRODUCTS TABLE
-- =====================================================
-- Stores normalized product information

CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    category_slug VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    image_url TEXT,
    specs JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. PRODUCT_PRICES TABLE
-- =====================================================
-- Links products to retailers with pricing information
-- This is the main table that gets updated during scraping

CREATE TABLE IF NOT EXISTS product_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
    price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BDT',
    product_url TEXT NOT NULL UNIQUE,
    in_stock BOOLEAN DEFAULT true,
    last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each product can only have one price per retailer
    UNIQUE(product_id, retailer_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
-- Indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_products_category_slug ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_retailer ON product_prices(retailer_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_url ON product_prices(product_url);
CREATE INDEX IF NOT EXISTS idx_product_prices_price ON product_prices(price);

CREATE INDEX IF NOT EXISTS idx_retailers_slug ON retailers(slug);
CREATE INDEX IF NOT EXISTS idx_retailers_active ON retailers(is_active);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
-- Automatically update the updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_prices_updated_at ON product_prices;
CREATE TRIGGER update_product_prices_updated_at
    BEFORE UPDATE ON product_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retailers_updated_at ON retailers;
CREATE TRIGGER update_retailers_updated_at
    BEFORE UPDATE ON retailers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (Optional)
-- =====================================================
-- Uncomment if you want to enable RLS

-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;

-- Allow read access to all
-- CREATE POLICY "Allow public read" ON products FOR SELECT TO PUBLIC USING (true);
-- CREATE POLICY "Allow public read" ON product_prices FOR SELECT TO PUBLIC USING (true);
-- CREATE POLICY "Allow public read" ON retailers FOR SELECT TO PUBLIC USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run these to verify tables were created

SELECT 'retailers' as table_name, count(*) as row_count FROM retailers
UNION ALL
SELECT 'products', count(*) FROM products
UNION ALL
SELECT 'product_prices', count(*) FROM product_prices;
