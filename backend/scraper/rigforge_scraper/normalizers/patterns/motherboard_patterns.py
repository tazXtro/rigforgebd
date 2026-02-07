"""
Motherboard detection patterns and mappings.

All regex patterns are pre-compiled for performance.
Supports dual-DDR chipsets (Z690, B650, etc.).
"""

import re
from typing import Pattern, Tuple, FrozenSet, Dict, List, Set

# =============================================================================
# CHIPSET TO SOCKET MAPPING
# =============================================================================

CHIPSET_TO_SOCKET: Dict[str, str] = {
    # AMD AM4 chipsets
    "A320": "AM4",
    "B350": "AM4",
    "X370": "AM4",
    "B450": "AM4",
    "X470": "AM4",
    "A520": "AM4",
    "B550": "AM4",
    "X570": "AM4",
    
    # AMD AM5 chipsets
    "A620": "AM5",
    "B650": "AM5",
    "B650E": "AM5",
    "B840": "AM5",
    "B850": "AM5",
    "B850E": "AM5",
    "X670": "AM5",
    "X670E": "AM5",
    "X870": "AM5",
    "X870E": "AM5",
    
    # AMD HEDT
    "TRX40": "sTRX4",
    "TRX50": "sTR5",
    "WRX80": "sWRX8",
    "WRX90": "sWRX9",
    
    # Intel LGA1200 (10th/11th Gen)
    "H410": "LGA1200",
    "B460": "LGA1200",
    "H470": "LGA1200",
    "Z490": "LGA1200",
    "H510": "LGA1200",
    "B560": "LGA1200",
    "H570": "LGA1200",
    "Z590": "LGA1200",
    
    # Intel LGA1700 (12th/13th/14th Gen)
    "H610": "LGA1700",
    "B660": "LGA1700",
    "H670": "LGA1700",
    "Z690": "LGA1700",
    "B760": "LGA1700",
    "H770": "LGA1700",
    "Z790": "LGA1700",
    
    # Intel LGA1851 (Arrow Lake)
    "Z890": "LGA1851",
    "B860": "LGA1851",
    "H810": "LGA1851",
    
    # Intel LGA1150 (4th/5th Gen Haswell/Broadwell)
    "H81": "LGA1150",
    "B85": "LGA1150",
    "H87": "LGA1150",
    "Z87": "LGA1150",
    "H97": "LGA1150",
    "Z97": "LGA1150",
    
    # Intel LGA1151 (6th-9th Gen)
    "H110": "LGA1151",
    "B150": "LGA1151",
    "H170": "LGA1151",
    "Z170": "LGA1151",
    "B250": "LGA1151",
    "H270": "LGA1151",
    "Z270": "LGA1151",
    "H310": "LGA1151",
    "B360": "LGA1151",
    "H370": "LGA1151",
    "Z370": "LGA1151",
    "B365": "LGA1151",
    "Z390": "LGA1151",
    
    # Intel HEDT
    "X299": "LGA2066",
    "X299X": "LGA2066",
    "W790": "LGA4677",
    "C621": "LGA3647",
    "C622": "LGA3647",
}


# =============================================================================
# CHIPSET TO DDR SUPPORT MAPPING
# =============================================================================
# Uses List[str] to properly support dual-DDR chipsets

CHIPSET_TO_DDR: Dict[str, List[str]] = {
    # AMD AM5 - DDR5 only
    "A620": ["DDR5"],
    "B650E": ["DDR5"],
    "B840": ["DDR5"],
    "B850": ["DDR5"],
    "B850E": ["DDR5"],
    "X670E": ["DDR5"],
    "X870": ["DDR5"],
    "X870E": ["DDR5"],
    
    # AMD AM5 - Dual DDR support (board-dependent)
    "B650": ["DDR4", "DDR5"],
    "X670": ["DDR4", "DDR5"],
    
    # AMD AM4 - DDR4 only
    "A320": ["DDR4"],
    "B350": ["DDR4"],
    "X370": ["DDR4"],
    "B450": ["DDR4"],
    "X470": ["DDR4"],
    "A520": ["DDR4"],
    "B550": ["DDR4"],
    "X570": ["DDR4"],
    
    # Intel LGA1851 (Arrow Lake) - DDR5 only
    "Z890": ["DDR5"],
    "B860": ["DDR5"],
    "H810": ["DDR5"],
    
    # Intel LGA1700 - Dual DDR support (board-dependent)
    "Z690": ["DDR4", "DDR5"],
    "B660": ["DDR4", "DDR5"],
    "H670": ["DDR4", "DDR5"],
    "Z790": ["DDR4", "DDR5"],
    "B760": ["DDR4", "DDR5"],
    "H770": ["DDR4", "DDR5"],
    "H610": ["DDR4", "DDR5"],
    
    # Intel LGA1200 - DDR4 only
    "H410": ["DDR4"],
    "B460": ["DDR4"],
    "H470": ["DDR4"],
    "Z490": ["DDR4"],
    "H510": ["DDR4"],
    "B560": ["DDR4"],
    "H570": ["DDR4"],
    "Z590": ["DDR4"],
    
    # Intel LGA1150 - DDR3 only
    "H81": ["DDR3"],
    "B85": ["DDR3"],
    "H87": ["DDR3"],
    "Z87": ["DDR3"],
    "H97": ["DDR3"],
    "Z97": ["DDR3"],
    
    # Intel LGA1151 - DDR4 (some early boards DDR3)
    "H110": ["DDR4", "DDR3"],
    "B150": ["DDR4", "DDR3"],
    "H170": ["DDR4"],
    "Z170": ["DDR4", "DDR3"],
    "B250": ["DDR4"],
    "H270": ["DDR4"],
    "Z270": ["DDR4"],
    "H310": ["DDR4"],
    "B360": ["DDR4"],
    "H370": ["DDR4"],
    "Z370": ["DDR4"],
    "B365": ["DDR4"],
    "Z390": ["DDR4"],
}


# =============================================================================
# CHIPSET DETECTION PATTERN
# =============================================================================
# Build pattern from known chipsets, sorted by length (longer first) to avoid partial matches

_CHIPSET_NAMES = sorted(CHIPSET_TO_SOCKET.keys(), key=len, reverse=True)
CHIPSET_PATTERN: Pattern[str] = re.compile(
    r'\b(' + '|'.join(re.escape(c) for c in _CHIPSET_NAMES) + r')[ME]?\b',
    re.I
)


# =============================================================================
# SOCKET DETECTION PATTERNS
# =============================================================================

SOCKET_PATTERNS: List[Tuple[Pattern[str], str]] = [
    # AMD sockets
    (re.compile(r'\bSocket\s*AM5\b', re.I), "AM5"),
    (re.compile(r'\bAM5\b', re.I), "AM5"),
    (re.compile(r'\bSocket\s*AM4\b', re.I), "AM4"),
    (re.compile(r'\bAM4\b', re.I), "AM4"),
    (re.compile(r'\bsTRX4\b', re.I), "sTRX4"),
    (re.compile(r'\bsTR5\b', re.I), "sTR5"),
    (re.compile(r'\bsWRX8\b', re.I), "sWRX8"),
    (re.compile(r'\bsWRX9\b', re.I), "sWRX9"),
    
    # Intel sockets
    (re.compile(r'\bLGA[\s-]?1851\b', re.I), "LGA1851"),
    (re.compile(r'\bLGA[\s-]?1700\b', re.I), "LGA1700"),
    (re.compile(r'\bLGA[\s-]?1200\b', re.I), "LGA1200"),
    (re.compile(r'\bLGA[\s-]?1151\b', re.I), "LGA1151"),
    (re.compile(r'\bLGA[\s-]?1150\b', re.I), "LGA1150"),
    (re.compile(r'\bSocket\s*1150\b', re.I), "LGA1150"),
    (re.compile(r'\bLGA[\s-]?2066\b', re.I), "LGA2066"),
    (re.compile(r'\bLGA[\s-]?4677\b', re.I), "LGA4677"),
    (re.compile(r'\bLGA[\s-]?3647\b', re.I), "LGA3647"),
]


# =============================================================================
# FORM FACTOR PATTERNS
# =============================================================================
# Ordered by specificity (E-ATX before ATX, etc.)

FORM_FACTOR_PATTERNS: List[Tuple[str, Pattern[str]]] = [
    ("E-ATX", re.compile(r'\bE[\s-]?ATX\b|\bExtended\s*ATX\b|\bEATX\b', re.I)),
    ("XL-ATX", re.compile(r'\bXL[\s-]?ATX\b', re.I)),
    ("Micro-ATX", re.compile(r'\bMicro[\s-]?ATX\b|\bmATX\b|\bM[\s-]?ATX\b', re.I)),
    ("Mini-ITX", re.compile(r'\bMini[\s-]?ITX\b|\bITX\b', re.I)),
    ("Mini-DTX", re.compile(r'\bMini[\s-]?DTX\b|\bDTX\b', re.I)),
    ("ATX", re.compile(r'\bATX\b', re.I)),  # Must be last (most generic)
]


# =============================================================================
# SPEC KEY MAPPINGS
# =============================================================================

SOCKET_SPEC_KEYS: FrozenSet[str] = frozenset([
    "socket",
    "cpu_socket",
    "processor_socket",
    "socket_type",
    "supported_cpu",
    "cpu_support",
    "processor_support",
])

CHIPSET_SPEC_KEYS: FrozenSet[str] = frozenset([
    "chipset",
    "chipset_model",
    "motherboard_chipset",
    "platform",
])

FORM_FACTOR_SPEC_KEYS: FrozenSet[str] = frozenset([
    "form_factor",
    "form",
    "size",
    "motherboard_form_factor",
    "board_form_factor",
    "format",
])

MEMORY_TYPE_SPEC_KEYS: FrozenSet[str] = frozenset([
    "type",
    "memory_type",
    "ram_type",
    "memory",
    "ddr",
    "memory_support",
    "supported_memory",
    "ram_support",
])

MEMORY_SLOTS_SPEC_KEYS: FrozenSet[str] = frozenset([
    "memory_slots",
    "ram_slots",
    "dimm_slots",
    "dimm",
    "slots",
    "memory_slot",
    "no_of_dimm",
    "number_of_dimm",
])

MEMORY_SPEED_SPEC_KEYS: FrozenSet[str] = frozenset([
    "memory_speed",
    "ram_speed",
    "max_memory_speed",
    "memory_frequency",
    "ddr_speed",
    "max_ddr_speed",
    "supported_memory_speed",
])

MEMORY_CAPACITY_SPEC_KEYS: FrozenSet[str] = frozenset([
    "max_memory",
    "maximum_memory",
    "max_ram",
    "memory_capacity",
    "max_memory_capacity",
    "supported_memory_capacity",
])


# =============================================================================
# DDR DETECTION PATTERNS
# =============================================================================

DDR5_PATTERN: Pattern[str] = re.compile(r'\bDDR5\b', re.I)
DDR4_PATTERN: Pattern[str] = re.compile(r'\bDDR4\b', re.I)
DDR3_PATTERN: Pattern[str] = re.compile(r'\bDDR3\b', re.I)

# Speed-based DDR inference thresholds
DDR5_MIN_SPEED = 4800  # DDR5 starts at 4800 MT/s
DDR4_MIN_SPEED = 2133  # DDR4 starts at 2133 MT/s
DDR4_MAX_SPEED = 4000  # Anything above likely DDR5
DDR3_MIN_SPEED = 800   # DDR3 starts at 800 MHz
DDR3_MAX_SPEED = 2133  # DDR3 tops out around 2133 (OC)

SPEED_PATTERN: Pattern[str] = re.compile(r'(\d{4,5})\s*(?:MHz|MT/s)', re.I)


# =============================================================================
# MOTHERBOARD BRANDING & NAMING
# =============================================================================

MOTHERBOARD_BRANDS: FrozenSet[str] = frozenset([
    "ASUS", "MSI", "Gigabyte", "ASRock", "Biostar", "EVGA",
    "NZXT", "Colorful", "Maxsun", "GALAX", "Supermicro"
])

PRODUCT_LINES: FrozenSet[str] = frozenset([
    # ASUS
    "ROG STRIX", "ROG CROSSHAIR", "ROG MAXIMUS", "TUF GAMING", 
    "PRIME", "ProArt", "ROG",
    # MSI
    "MAG", "MEG", "MPG", "PRO", "GAMING PLUS", "CARBON", 
    "ACE", "GODLIKE", "UNIFY",
    # Gigabyte
    "AORUS", "AORUS MASTER", "AORUS ELITE", "AORUS ULTRA",
    "AORUS PRO", "GAMING", "GAMING X",
    # ASRock
    "PHANTOM GAMING", "TAICHI", "STEEL LEGEND", "PG", 
    "CREATOR", "EXTREME", "VELOCITA",
])

WIFI_FEATURES: FrozenSet[str] = frozenset([
    "WIFI", "WI-FI", "AX", "WIFI6", "WIFI 6", "WIFI6E", 
    "WIFI 6E", "WIFI7", "WIFI 7", "BE"
])

STRIP_WORDS: FrozenSet[str] = frozenset([
    "Motherboard", "Gaming Motherboard", "Mainboard",
    "LGA1700", "LGA1200", "LGA1151", "LGA1851",
    "AM4", "AM5", "Socket",
    "DDR4", "DDR5",
    "ATX", "Micro-ATX", "Mini-ITX", "mATX", "E-ATX", "EATX",
    "Gen5", "Gen4", "Gen3", "PCIe", "USB 3", "USB4",
    "RGB", "ARGB", "Aura Sync", "Mystic Light",
])


# =============================================================================
# MEMORY SLOT COUNT VALIDATION
# =============================================================================

MIN_MEMORY_SLOTS = 1
MAX_MEMORY_SLOTS = 8


# =============================================================================
# MEMORY SPEED VALIDATION
# =============================================================================

MIN_MEMORY_SPEED_MHZ = 800   # DDR3 can go as low as 800 MHz
MAX_MEMORY_SPEED_MHZ = 10000


# =============================================================================
# MEMORY CAPACITY VALIDATION
# =============================================================================

MIN_MEMORY_CAPACITY_GB = 8
MAX_MEMORY_CAPACITY_GB = 1024
