"""
CPU detection patterns and mappings.

All regex patterns are pre-compiled for performance.
"""

import re
from typing import Pattern, Tuple, Optional, FrozenSet, Dict, List

# =============================================================================
# SOCKET DETECTION PATTERNS
# =============================================================================
# Each tuple: (compiled_pattern, canonical_socket_name)
# Order matters - more specific patterns should come first

SOCKET_PATTERNS: List[Tuple[Pattern[str], str]] = [
    # AMD sockets
    (re.compile(r'\bSocket\s*AM5\b', re.I), "AM5"),
    (re.compile(r'\bAM5\b', re.I), "AM5"),
    (re.compile(r'\bSocket\s*AM4\b', re.I), "AM4"),
    (re.compile(r'\bAM4\b', re.I), "AM4"),
    (re.compile(r'\bsTRX4\b', re.I), "sTRX4"),
    (re.compile(r'\bTRX4\b', re.I), "sTRX4"),  # TRX4 without 's' prefix
    (re.compile(r'\bsTR4\b', re.I), "sTR4"),
    (re.compile(r'\bTR4\b', re.I), "sTR4"),    # TR4 without 's' prefix
    (re.compile(r'\bsTR5\b', re.I), "sTR5"),
    (re.compile(r'\bTR5\b', re.I), "sTR5"),    # TR5 without 's' prefix
    (re.compile(r'\bsWRX8\b', re.I), "sWRX8"),
    (re.compile(r'\bWRX8\b', re.I), "sWRX8"),  # WRX8 without 's' prefix
    (re.compile(r'\bSP3\b', re.I), "SP3"),
    
    # Intel sockets - specific variants first
    (re.compile(r'\bLGA[\s-]?2011[\s-]?[vV]3\b', re.I), "LGA2011-v3"),
    (re.compile(r'\bLGA[\s-]?2011\b', re.I), "LGA2011"),
    (re.compile(r'\bLGA[\s-]?1851\b', re.I), "LGA1851"),
    (re.compile(r'\bLGA[\s-]?1700\b', re.I), "LGA1700"),
    (re.compile(r'\bLGA[\s-]?1200\b', re.I), "LGA1200"),
    (re.compile(r'\bLGA[\s-]?1151\b', re.I), "LGA1151"),
    (re.compile(r'\bLGA[\s-]?1150\b', re.I), "LGA1150"),
    (re.compile(r'\bLGA[\s-]?2066\b', re.I), "LGA2066"),
    (re.compile(r'\bLGA[\s-]?4677\b', re.I), "LGA4677"),
    (re.compile(r'\bLGA[\s-]?3647\b', re.I), "LGA3647"),
]


# =============================================================================
# GENERATION DETECTION PATTERNS
# =============================================================================
# Each entry: compiled_pattern -> (generation_name, inferred_socket)

GENERATION_MAP: Dict[Pattern[str], Tuple[str, str]] = {
    # AMD Ryzen 9000 series (AM5)
    re.compile(r'Ryzen\s+[3579]\s+9\d{3}', re.I): ("Ryzen 9000", "AM5"),
    re.compile(r'Ryzen\s+AI\s+9\s+\d{3}', re.I): ("Ryzen AI 300", "AM5"),
    
    # AMD Ryzen 8000 series (AM5)
    re.compile(r'Ryzen\s+[3579]\s+8\d{3}G', re.I): ("Ryzen 8000G", "AM5"),
    re.compile(r'Ryzen\s+[3579]\s+8\d{3}F', re.I): ("Ryzen 8000", "AM5"),
    
    # AMD Ryzen 7000 series (AM5)
    re.compile(r'Ryzen\s+[3579]\s+7\d{3}', re.I): ("Ryzen 7000", "AM5"),
    
    # AMD Ryzen 5000 series (AM4)
    re.compile(r'Ryzen\s+[3579]\s+5\d{3}', re.I): ("Ryzen 5000", "AM4"),
    
    # AMD Ryzen 4000 series (AM4)
    re.compile(r'Ryzen\s+[357]\s+4\d{3}', re.I): ("Ryzen 4000", "AM4"),
    
    # AMD Ryzen 3000 series (AM4)
    re.compile(r'Ryzen\s+[3579]\s+3\d{3}', re.I): ("Ryzen 3000", "AM4"),
    
    # AMD Ryzen 2000 series (AM4)
    re.compile(r'Ryzen\s+[357]\s+2\d{3}', re.I): ("Ryzen 2000", "AM4"),
    
    # AMD Ryzen 1000 series (AM4)
    re.compile(r'Ryzen\s+[357]\s+1\d{3}', re.I): ("Ryzen 1000", "AM4"),
    
    # AMD Athlon (AM4)
    re.compile(r'Athlon\s+\d{3,4}GE?', re.I): ("Athlon AM4", "AM4"),
    re.compile(r'Athlon\s+PRO', re.I): ("Athlon PRO AM4", "AM4"),
    
    # Intel Arrow Lake (LGA1851)
    re.compile(r'Core\s+Ultra\s+[2579]\s+2\d{2}', re.I): ("Arrow Lake", "LGA1851"),
    
    # Intel 14th Gen Raptor Lake Refresh (LGA1700)
    re.compile(r'Core\s+i[3579][\s-]?14\d{3}', re.I): ("14th Gen Raptor Lake Refresh", "LGA1700"),
    re.compile(r'14th\s+Gen.*Core\s+i[3579]', re.I): ("14th Gen Raptor Lake Refresh", "LGA1700"),
    
    # Intel 13th Gen Raptor Lake (LGA1700)
    re.compile(r'Core\s+i[3579][\s-]?13\d{3}', re.I): ("13th Gen Raptor Lake", "LGA1700"),
    re.compile(r'13th\s+Gen.*Core\s+i[3579]', re.I): ("13th Gen Raptor Lake", "LGA1700"),
    
    # Intel 12th Gen Alder Lake (LGA1700)
    re.compile(r'Core\s+i[3579][\s-]?12\d{3}', re.I): ("12th Gen Alder Lake", "LGA1700"),
    re.compile(r'12th\s+Gen.*Core\s+i[3579]', re.I): ("12th Gen Alder Lake", "LGA1700"),
    
    # Intel 11th Gen Rocket Lake (LGA1200)
    re.compile(r'Core\s+i[3579][\s-]?11\d{3}', re.I): ("11th Gen Rocket Lake", "LGA1200"),
    re.compile(r'11th\s+Gen.*Core\s+i[3579]', re.I): ("11th Gen Rocket Lake", "LGA1200"),
    
    # Intel 10th Gen Comet Lake (LGA1200)
    re.compile(r'Core\s+i[3579][\s-]?10\d{3}', re.I): ("10th Gen Comet Lake", "LGA1200"),
    re.compile(r'10th\s+Gen.*Core\s+i[3579]', re.I): ("10th Gen Comet Lake", "LGA1200"),
    
    # Intel 9th Gen Coffee Lake Refresh (LGA1151)
    re.compile(r'Core\s+i[3579][\s-]?9\d{3}', re.I): ("9th Gen Coffee Lake Refresh", "LGA1151"),
    re.compile(r'9th\s+Gen.*Core\s+i[3579]', re.I): ("9th Gen Coffee Lake Refresh", "LGA1151"),
    
    # Intel 8th Gen Coffee Lake (LGA1151)
    re.compile(r'Core\s+i[3579][\s-]?8\d{3}', re.I): ("8th Gen Coffee Lake", "LGA1151"),
    re.compile(r'8th\s+Gen.*Core\s+i[3579]', re.I): ("8th Gen Coffee Lake", "LGA1151"),
    
    # Intel 7th Gen Kaby Lake (LGA1151)
    re.compile(r'Core\s+i[3579][\s-]?7\d{3}', re.I): ("7th Gen Kaby Lake", "LGA1151"),
    re.compile(r'7th\s+Gen.*Core\s+i[3579]', re.I): ("7th Gen Kaby Lake", "LGA1151"),
    
    # Intel 6th Gen Skylake (LGA1151)
    re.compile(r'Core\s+i[3579][\s-]?6\d{3}', re.I): ("6th Gen Skylake", "LGA1151"),
    re.compile(r'6th\s+Gen.*Core\s+i[3579]', re.I): ("6th Gen Skylake", "LGA1151"),
    
    # Intel HEDT - Haswell-E (LGA2011-v3)
    re.compile(r'Core\s+i7[\s-]?5[89]\d{2}[KX]?', re.I): ("5th Gen Haswell-E", "LGA2011-v3"),
    
    # Intel HEDT - Ivy Bridge-E (LGA2011)
    re.compile(r'Core\s+i7[\s-]?4[89]\d{2}[KX]?', re.I): ("4th Gen Ivy Bridge-E", "LGA2011"),
}


# =============================================================================
# BRAND DETECTION
# =============================================================================

AMD_BRAND_INDICATORS: FrozenSet[str] = frozenset([
    "AMD", "RYZEN", "THREADRIPPER", "EPYC", "ATHLON", "OPTERON"
])

INTEL_BRAND_INDICATORS: FrozenSet[str] = frozenset([
    "INTEL", "CORE I", "CORE ULTRA", "PENTIUM", "CELERON", "XEON"
])


# =============================================================================
# SPEC KEY MAPPINGS
# =============================================================================
# Using frozenset for O(1) lookup and immutability

SOCKET_SPEC_KEYS: FrozenSet[str] = frozenset([
    "socket",
    "cpu_socket",
    "processor_socket",
    "socket_type",
    "cpu_socket_type",
    "socket_compatibility",
    "platform",
])

TDP_SPEC_KEYS: FrozenSet[str] = frozenset([
    "tdp",
    "thermal_design_power",
    "tdp_watt",
    "tdp_w",
    "power",
    "processor_tdp",
    "default_tdp",
    "base_tdp",
])


# =============================================================================
# CPU NAME EXTRACTION PATTERNS
# =============================================================================

# Intel Core iX-XXXXX (i5-11500, i7-14700K, i9-13900KS)
INTEL_CORE_PATTERN = re.compile(
    r'\b(i[3579])[\s-]?(\d{4,5})([KFSTX]{0,3})\b',
    re.I
)

# Intel Core Ultra X XXXK (Arrow Lake: Ultra 5 245K)
INTEL_ULTRA_PATTERN = re.compile(
    r'\bCore\s+Ultra\s+([579])\s+(\d{3})([KFSH]?)\b',
    re.I
)

# AMD Ryzen X XXXXG/X/F/GT/X3D
RYZEN_PATTERN = re.compile(
    r'\bRyzen\s+([3579])\s+(\d{4})(GT|G|X3D|X|F|H)?\b',
    re.I
)

# AMD Threadripper
THREADRIPPER_PATTERN = re.compile(
    r'\bThreadripper(?:\s+PRO)?\s+(\d{4})[WX]?[X]?\b',
    re.I
)
THREADRIPPER_PRO_CHECK = re.compile(r'\bPRO\b', re.I)

# Intel Xeon
XEON_PATTERN = re.compile(
    r'\bXeon\s+(E[35]|W|Platinum|Gold|Silver|Bronze)[\s-]?(\d{4})[\s-]?([VvMmL]?\d?)?\s*([A-Z]?)\b',
    re.I
)

# AMD EPYC
EPYC_PATTERN = re.compile(r'\bEPYC\s+(\d{4})P?\b', re.I)

# AMD Athlon
ATHLON_PATTERN = re.compile(r'\bAthlon\s+(\d{3,4})([GE]{0,2})\b', re.I)

# AMD A-series APU
AMD_APU_PATTERN = re.compile(r'\bA([468]|10|12)[\s-]?(\d{4})K?\b', re.I)

# AMD Opteron
OPTERON_PATTERN = re.compile(r'\bOpteron\s+(\d{4})\b', re.I)

# Intel i7 Extreme
I7_EXTREME_PATTERN = re.compile(r'\bi7\s+Extreme\s+(\d{4})X?\b', re.I)

# Intel Pentium Gold
PENTIUM_GOLD_PATTERN = re.compile(r'\bPentium\s+Gold\s+(G\d{4})\b', re.I)

# Intel Celeron
CELERON_PATTERN = re.compile(r'\bCeleron\s+(G\d{4})\b', re.I)


# =============================================================================
# TDP EXTRACTION PATTERNS
# =============================================================================

TDP_WATT_PATTERN = re.compile(r'(\d+)\s*[Ww](?:att)?', re.I)
TDP_TITLE_PATTERN = re.compile(r'(\d+)\s*[Ww]\s*TDP', re.I)

# Reasonable TDP range for validation
TDP_MIN_WATTS = 15
TDP_MAX_WATTS = 500


# =============================================================================
# SOCKET NORMALIZATION UTILITY
# =============================================================================

def normalize_socket(socket_text: str) -> Optional[str]:
    """
    Normalize a socket string to its canonical form.
    
    This is useful for matching socket names from different sources
    (CSV datasets, scraped specs, etc.) to a consistent format.
    
    Args:
        socket_text: Raw socket string (e.g., "LGA 1700", "Socket AM4")
        
    Returns:
        Canonical socket name (e.g., "LGA1700", "AM4") or None
        
    Examples:
        >>> normalize_socket("LGA 1700")
        'LGA1700'
        >>> normalize_socket("Socket AM4")
        'AM4'
        >>> normalize_socket("LGA2011-v3")
        'LGA2011-v3'
    """
    if not socket_text:
        return None
    
    # Try matching against known socket patterns
    for pattern, canonical_name in SOCKET_PATTERNS:
        if pattern.search(socket_text):
            return canonical_name
    
    # Fallback: try to parse LGA format manually
    socket_upper = socket_text.strip().upper()
    lga_match = re.search(r'\bLGA[\s-]?(\d+)(?:[\s-]?[vV](\d))?\b', socket_upper)
    if lga_match:
        number = lga_match.group(1)
        version = lga_match.group(2)
        if version:
            return f"LGA{number}-v{version}"
        return f"LGA{number}"
    
    # Fallback: try AMD legacy sockets
    if re.search(r'\bFM2\+', socket_upper):
        return 'FM2+'
    if re.search(r'\bFM2\b', socket_upper):
        return 'FM2'
    if re.search(r'\bAM3\+', socket_upper):
        return 'AM3+'
    if re.search(r'\bAM3\b', socket_upper):
        return 'AM3'
    
    return None
