"""
RAM/Memory detection patterns and mappings.

All regex patterns are pre-compiled for performance.
"""

import re
from typing import Pattern, Tuple, FrozenSet, List

# =============================================================================
# DDR TYPE DETECTION PATTERNS
# =============================================================================
# Each tuple: (compiled_pattern, canonical_ddr_type)

DDR_PATTERNS: List[Tuple[Pattern[str], str]] = [
    (re.compile(r'\bDDR5\b', re.I), "DDR5"),
    (re.compile(r'\bDDR4\b', re.I), "DDR4"),
    (re.compile(r'\bDDR3L?\b', re.I), "DDR3"),
    (re.compile(r'\bDDR2\b', re.I), "DDR2"),
]


# =============================================================================
# SPEED EXTRACTION PATTERNS
# =============================================================================
# Various formats: DDR5-6000, PC5-48000, 6000MHz, 6000 MT/s

SPEED_PATTERNS: List[Pattern[str]] = [
    # DDR5-6000 or DDR4-3200 format
    re.compile(r'DDR[45][\s-](\d{4,5})', re.I),
    
    # PC5-48000 format (divide by 8 to get MHz)
    re.compile(r'PC[45][\s-](\d{5})', re.I),
    
    # 6000MHz or 6000 MT/s format
    re.compile(r'(\d{4,5})\s*(?:MHz|MT/s)', re.I),
    
    # Speed/Frequency: 6000 format
    re.compile(r'(?:speed|frequency|clock)[:\s]*(\d{4,5})', re.I),
]

# PC format detection for proper conversion
PC_FORMAT_PATTERN: Pattern[str] = re.compile(r'^PC[45]', re.I)


# =============================================================================
# CAPACITY EXTRACTION PATTERNS
# =============================================================================

# Kit format: 32GB (2x16GB)
KIT_CAPACITY_PATTERN: Pattern[str] = re.compile(
    r'(\d+)\s*GB\s*\(\s*(\d+)\s*x\s*(\d+)\s*GB\s*\)',
    re.I
)

# Spec format: 2 x 16GB or 2x16GB
SPEC_KIT_PATTERN: Pattern[str] = re.compile(
    r'(\d+)\s*x\s*(\d+)\s*GB',
    re.I
)

# Simple capacity: 32GB
SIMPLE_CAPACITY_PATTERN: Pattern[str] = re.compile(
    r'(\d+)\s*GB',
    re.I
)


# =============================================================================
# MODULE COUNT PATTERNS
# =============================================================================

MODULE_COUNT_PATTERNS: List[Tuple[Pattern[str], int]] = [
    # Explicit count: 2x, 4x, etc.
    (re.compile(r'(\d+)\s*x\s*\d+\s*GB', re.I), 0),  # Extract from group 1
    (re.compile(r'\(\s*(\d+)\s*x\s*\d+\s*GB\s*\)', re.I), 0),  # (2x16GB)
    (re.compile(r'(\d+)\s*Pack', re.I), 0),
    
    # Named patterns (fixed count)
    (re.compile(r'\bDual\s*(?:Channel|Kit)\b', re.I), 2),
    (re.compile(r'\bQuad\s*(?:Channel|Kit)\b', re.I), 4),
    (re.compile(r'\bSingle\s*(?:Channel|Kit|Stick)\b', re.I), 1),
]


# =============================================================================
# SPEC KEY MAPPINGS
# =============================================================================

MEMORY_TYPE_SPEC_KEYS: FrozenSet[str] = frozenset([
    "memory_type",
    "type",
    "ddr",
    "ram_type",
    "technology",
])

MEMORY_SPEED_SPEC_KEYS: FrozenSet[str] = frozenset([
    "speed",
    "frequency",
    "clock",
    "memory_speed",
    "ram_speed",
    "data_rate",
    "transfer_rate",
    "mhz",
    "mt_s",
])

MEMORY_CAPACITY_SPEC_KEYS: FrozenSet[str] = frozenset([
    "capacity",
    "size",
    "memory_size",
    "total_capacity",
    "kit_capacity",
    "ram_size",
    "memory_capacity",
])

MEMORY_MODULES_SPEC_KEYS: FrozenSet[str] = frozenset([
    "modules",
    "sticks",
    "dimms",
    "pieces",
    "quantity",
    "kit_type",
    "configuration",
    "module_count",
])


# =============================================================================
# DDR INFERENCE THRESHOLDS
# =============================================================================
# Used when DDR type isn't explicitly mentioned

DDR5_MIN_SPEED = 4800   # DDR5 starts at 4800 MT/s
DDR4_MIN_SPEED = 2133   # DDR4 starts at 2133 MT/s
DDR4_MAX_SPEED = 4000   # Speeds above this are likely DDR5
DDR3_MIN_SPEED = 800
DDR3_MAX_SPEED = 2133

# Confidence levels for speed-based inference
DDR_INFERENCE_CONFIDENCE = 0.70


# =============================================================================
# VALIDATION RANGES
# =============================================================================

MIN_MEMORY_SPEED_MHZ = 1600
MAX_MEMORY_SPEED_MHZ = 10000

MIN_MODULE_COUNT = 1
MAX_MODULE_COUNT = 8

# Valid capacity values (powers of 2, or common kit totals)
VALID_CAPACITIES_GB = frozenset([
    4, 8, 16, 32, 48, 64, 96, 128, 192, 256
])


# =============================================================================
# ECC DETECTION PATTERNS
# =============================================================================

NON_ECC_PATTERN: Pattern[str] = re.compile(r'\bNON[\s-]?ECC\b', re.I)
ECC_PATTERN: Pattern[str] = re.compile(r'\bECC\b', re.I)
REGISTERED_PATTERN: Pattern[str] = re.compile(r'\bR(?:EGISTERED)?DIMM\b', re.I)
UNBUFFERED_PATTERN: Pattern[str] = re.compile(r'\bU(?:NBUFFERED)?DIMM\b', re.I)
