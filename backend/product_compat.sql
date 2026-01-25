-- =====================================================
-- RigForgeBD Product Compatibility Table
-- =====================================================
-- Run this in your Supabase SQL Editor after products.sql
-- Stores normalized, canonical compatibility attributes for
-- context-aware component filtering (CPU→Motherboard→RAM)

-- =====================================================
-- PRODUCT_COMPAT TABLE
-- =====================================================
-- Stores extracted compatibility attributes in typed columns
-- for fast, accurate compatibility queries

CREATE TABLE IF NOT EXISTS product_compat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    
    -- Component Type (for efficient filtering)
    component_type VARCHAR(20) NOT NULL,  -- 'cpu', 'motherboard', 'ram'
    
    -- =====================================================
    -- CPU Compatibility Fields
    -- =====================================================
    cpu_socket VARCHAR(20),               -- 'AM4', 'AM5', 'LGA1700', 'LGA1200', 'LGA1851'
    cpu_brand VARCHAR(20),                -- 'AMD', 'Intel'
    cpu_generation VARCHAR(50),           -- 'Ryzen 5000', 'Ryzen 7000', 'Raptor Lake', etc.
    cpu_tdp_watts INTEGER,                -- TDP in watts (for future cooler compatibility)
    canonical_cpu_name VARCHAR(100),      -- Normalized CPU name for dataset matching: 'i5-14400', 'Ryzen 5 5600G'
    
    -- =====================================================
    -- Motherboard Compatibility Fields
    -- =====================================================
    mobo_socket VARCHAR(20),              -- 'AM4', 'AM5', 'LGA1700', 'LGA1200', 'LGA1851'
    mobo_chipset VARCHAR(20),             -- 'B550', 'X670', 'Z790', 'B760', etc.
    mobo_form_factor VARCHAR(20),         -- 'ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'
    canonical_mobo_name VARCHAR(150),     -- Normalized mobo name for dataset matching: 'MSI B550M PRO-VDH'
    
    -- =====================================================
    -- Memory Compatibility Fields (shared by Motherboard & RAM)
    -- =====================================================
    -- For Motherboards: what memory the board supports
    -- For RAM: what the module is
    memory_type VARCHAR(10),              -- 'DDR4', 'DDR5'
    memory_slots INTEGER,                 -- Number of DIMM slots (motherboard only)
    memory_max_speed_mhz INTEGER,         -- Max supported speed (motherboard) or actual speed (RAM)
    memory_max_capacity_gb INTEGER,       -- Max total RAM capacity (motherboard only)
    memory_capacity_gb INTEGER,           -- Capacity per module (RAM only)
    memory_modules INTEGER,               -- Number of modules in kit (RAM only, e.g., 2 for 2x8GB)
    memory_ecc_support BOOLEAN,           -- ECC support flag
    
    -- =====================================================
    -- Extraction Metadata
    -- =====================================================
    confidence NUMERIC(3,2) NOT NULL DEFAULT 0.00,  -- 0.00-1.00 extraction confidence
    extraction_source VARCHAR(20),        -- 'specs', 'title', 'inferred'
    extraction_warnings TEXT[],           -- Array of warning messages
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
-- Index for component type filtering
CREATE INDEX IF NOT EXISTS idx_compat_component_type 
    ON product_compat(component_type);

-- CPU socket index (partial for CPU components only)
CREATE INDEX IF NOT EXISTS idx_compat_cpu_socket 
    ON product_compat(cpu_socket) 
    WHERE component_type = 'cpu';

-- Motherboard socket index (partial for motherboard components only)
CREATE INDEX IF NOT EXISTS idx_compat_mobo_socket 
    ON product_compat(mobo_socket) 
    WHERE component_type = 'motherboard';

-- Memory type index
CREATE INDEX IF NOT EXISTS idx_compat_memory_type 
    ON product_compat(memory_type);

-- Chipset index for motherboards
CREATE INDEX IF NOT EXISTS idx_compat_mobo_chipset 
    ON product_compat(mobo_chipset) 
    WHERE component_type = 'motherboard';

-- Confidence index for filtering reliable extractions
CREATE INDEX IF NOT EXISTS idx_compat_confidence 
    ON product_compat(confidence);

-- Composite index for common compatibility queries
-- (find motherboards by socket with minimum confidence)
CREATE INDEX IF NOT EXISTS idx_compat_socket_confidence 
    ON product_compat(mobo_socket, confidence) 
    WHERE component_type = 'motherboard';

-- Composite index for RAM compatibility queries
CREATE INDEX IF NOT EXISTS idx_compat_ram_type_speed 
    ON product_compat(memory_type, memory_max_speed_mhz) 
    WHERE component_type = 'ram';

-- Canonical name indexes for dataset matching
CREATE INDEX IF NOT EXISTS idx_compat_canonical_cpu_name 
    ON product_compat(canonical_cpu_name) 
    WHERE component_type = 'cpu';

CREATE INDEX IF NOT EXISTS idx_compat_canonical_mobo_name 
    ON product_compat(canonical_mobo_name) 
    WHERE component_type = 'motherboard';

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
-- Reuse the update_updated_at_column function from products.sql
DROP TRIGGER IF EXISTS update_product_compat_updated_at ON product_compat;
CREATE TRIGGER update_product_compat_updated_at
    BEFORE UPDATE ON product_compat
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE product_compat ENABLE ROW LEVEL SECURITY;

-- Allow public read access (same pattern as products table)
CREATE POLICY "Allow public read access on product_compat" 
    ON product_compat FOR SELECT 
    USING (true);

-- Allow authenticated insert/update (for scraper service)
CREATE POLICY "Allow authenticated insert on product_compat" 
    ON product_compat FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on product_compat" 
    ON product_compat FOR UPDATE 
    USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE product_compat IS 'Normalized compatibility attributes for context-aware component filtering';
COMMENT ON COLUMN product_compat.component_type IS 'Component type: cpu, motherboard, or ram';
COMMENT ON COLUMN product_compat.cpu_socket IS 'CPU socket type (AM4, AM5, LGA1700, etc.)';
COMMENT ON COLUMN product_compat.mobo_socket IS 'Motherboard socket type (must match CPU socket for compatibility)';
COMMENT ON COLUMN product_compat.mobo_chipset IS 'Motherboard chipset (B550, X670, Z790, etc.)';
COMMENT ON COLUMN product_compat.memory_type IS 'Memory type (DDR4, DDR5) - must match between motherboard and RAM';
COMMENT ON COLUMN product_compat.confidence IS 'Extraction confidence score: 0.95+ direct, 0.70+ inferred, below 0.70 uncertain';
COMMENT ON COLUMN product_compat.extraction_source IS 'Where the data was extracted from: specs, title, or inferred';
