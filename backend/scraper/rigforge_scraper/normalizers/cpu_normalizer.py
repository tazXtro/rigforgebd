"""
CPU Normalizer for extracting processor compatibility attributes.

Extracts socket type, brand, generation, and TDP from CPU product data.
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple

from .base import BaseNormalizer, ExtractionResult

logger = logging.getLogger(__name__)


class CPUNormalizer(BaseNormalizer):
    """
    Normalizer for extracting CPU compatibility attributes.
    
    Extracts:
        - cpu_socket: AM4, AM5, LGA1700, etc.
        - cpu_brand: AMD or Intel
        - cpu_generation: Ryzen 5000, Raptor Lake, etc.
        - cpu_tdp_watts: TDP in watts
    """
    
    # Socket patterns in priority order (most specific first)
    SOCKET_PATTERNS = [
        # AMD sockets
        (r'\bAM5\b', 'AM5'),
        (r'\bAM4\b', 'AM4'),
        (r'\bSocket\s*AM5\b', 'AM5'),
        (r'\bSocket\s*AM4\b', 'AM4'),
        (r'\bsTR[X]?4\b', 'sTRX4'),  # Threadripper
        (r'\bSP3\b', 'SP3'),  # EPYC
        
        # Intel LGA sockets (order matters: more specific first)
        (r'\bLGA[\s\-]?2011[\s\-]?(?:v3|V3)\b', 'LGA2011-v3'),  # Haswell-E (i7-5xxx-K)
        (r'\bLGA[\s\-]?2011\b', 'LGA2011'),  # Sandy Bridge-E / Ivy Bridge-E / Haswell-E
        (r'\bLGA[\s\-]?1851\b', 'LGA1851'),  # Arrow Lake
        (r'\bLGA[\s\-]?1700\b', 'LGA1700'),  # Alder/Raptor/Refresh
        (r'\bLGA[\s\-]?1200\b', 'LGA1200'),  # 10th/11th Gen
        (r'\bLGA[\s\-]?1151\b', 'LGA1151'),  # 6th-9th Gen
        (r'\bLGA[\s\-]?1150\b', 'LGA1150'),  # 4th/5th Gen mainstream
        (r'\bLGA[\s\-]?2066\b', 'LGA2066'),  # HEDT (Skylake-X, etc.)
        (r'\bLGA[\s\-]?4677\b', 'LGA4677'),  # Xeon
        
        # Generic socket capture
        (r'\bSocket\s+(AM\d)\b', None),  # Capture group for AM sockets
        (r'\bSocket\s+(LGA\d+)\b', None),  # Capture group for LGA
    ]
    
    # CPU generation patterns for inference and metadata
    # Maps regex pattern to (generation_name, inferred_socket)
    GENERATION_PATTERNS = {
        # AMD Ryzen 9000 series (AM5)
        r'Ryzen\s+[3579]\s+9\d{3}': ('Ryzen 9000', 'AM5'),
        r'Ryzen\s+AI\s+9\s+\d{3}': ('Ryzen AI 300', 'AM5'),
        
        # AMD Ryzen 8000G series (AM5) - Hawk Point APUs
        r'Ryzen\s+[3579]\s+8[0-9]{3}G': ('Ryzen 8000G', 'AM5'),
        r'Ryzen\s+[3579]\s+8[0-9]{3}F': ('Ryzen 8000', 'AM5'),
        
        # AMD Ryzen 7000 series (AM5)
        r'Ryzen\s+[3579]\s+7[0-9]{3}': ('Ryzen 7000', 'AM5'),
        
        # AMD Ryzen 5000 series (AM4)
        r'Ryzen\s+[3579]\s+5[0-9]{3}': ('Ryzen 5000', 'AM4'),
        
        # AMD Ryzen 4000 series (AM4) - Renoir desktop APUs
        r'Ryzen\s+[357]\s+4[0-9]{3}': ('Ryzen 4000', 'AM4'),
        
        # AMD Ryzen 3000 series (AM4)
        r'Ryzen\s+[3579]\s+3[0-9]{3}': ('Ryzen 3000', 'AM4'),
        
        # AMD Ryzen 2000 series (AM4) - including APUs like 2200G, 2400G
        r'Ryzen\s+[357]\s+2[0-9]{3}': ('Ryzen 2000', 'AM4'),
        
        # AMD Ryzen 1000 series (AM4)
        r'Ryzen\s+[357]\s+1[0-9]{3}': ('Ryzen 1000', 'AM4'),
        
        # AMD Athlon (AM4)
        r'Athlon\s+\d{3}GE?': ('Athlon AM4', 'AM4'),
        r'Athlon\s+PRO': ('Athlon PRO AM4', 'AM4'),
        
        # Intel Core Ultra 200 (Arrow Lake - LGA1851)
        r'Core\s+Ultra\s+[579]\s+2[0-9]{2}': ('Arrow Lake', 'LGA1851'),
        
        # Intel 14th Gen (LGA1700)
        r'Core\s+i[3579][\s\-]?14\d{3}': ('14th Gen Raptor Lake Refresh', 'LGA1700'),
        r'14th\s+Gen.*Core\s+i[3579]': ('14th Gen Raptor Lake Refresh', 'LGA1700'),
        
        # Intel 13th Gen (LGA1700)
        r'Core\s+i[3579][\s\-]?13\d{3}': ('13th Gen Raptor Lake', 'LGA1700'),
        r'13th\s+Gen.*Core\s+i[3579]': ('13th Gen Raptor Lake', 'LGA1700'),
        
        # Intel 12th Gen (LGA1700)
        r'Core\s+i[3579][\s\-]?12\d{3}': ('12th Gen Alder Lake', 'LGA1700'),
        r'12th\s+Gen.*Core\s+i[3579]': ('12th Gen Alder Lake', 'LGA1700'),
        
        # Intel 11th Gen (LGA1200)
        r'Core\s+i[3579][\s\-]?11\d{3}': ('11th Gen Rocket Lake', 'LGA1200'),
        r'11th\s+Gen.*Core\s+i[3579]': ('11th Gen Rocket Lake', 'LGA1200'),
        
        # Intel 10th Gen (LGA1200)
        r'Core\s+i[3579][\s\-]?10\d{3}': ('10th Gen Comet Lake', 'LGA1200'),
        r'10th\s+Gen.*Core\s+i[3579]': ('10th Gen Comet Lake', 'LGA1200'),
        
        # Intel 9th Gen (LGA1151)
        r'Core\s+i[3579][\s\-]?9\d{3}': ('9th Gen Coffee Lake Refresh', 'LGA1151'),
        r'9th\s+Gen.*Core\s+i[3579]': ('9th Gen Coffee Lake Refresh', 'LGA1151'),
        
        # Intel 8th Gen (LGA1151)
        r'Core\s+i[3579][\s\-]?8\d{3}': ('8th Gen Coffee Lake', 'LGA1151'),
        r'8th\s+Gen.*Core\s+i[3579]': ('8th Gen Coffee Lake', 'LGA1151'),
        
        # Intel 7th Gen (LGA1151)
        r'Core\s+i[3579][\s\-]?7\d{3}': ('7th Gen Kaby Lake', 'LGA1151'),
        r'7th\s+Gen.*Core\s+i[3579]': ('7th Gen Kaby Lake', 'LGA1151'),
        
        # Intel 6th Gen (LGA1151)
        r'Core\s+i[3579][\s\-]?6\d{3}': ('6th Gen Skylake', 'LGA1151'),
        r'6th\s+Gen.*Core\s+i[3579]': ('6th Gen Skylake', 'LGA1151'),
        
        # Intel 5th Gen HEDT (LGA2011-v3) - i7-5820K, i7-5930K, i7-5960X
        r'Core\s+i7[\s\-]?5[89]\d{2}[KX]?': ('5th Gen Haswell-E', 'LGA2011-v3'),
        r'5th\s+Gen.*Core\s+i7[\s\-]?5[89]': ('5th Gen Haswell-E', 'LGA2011-v3'),
        
        # Intel 4th Gen HEDT (LGA2011-v3) - i7-4820K, i7-4930K, i7-4960X
        r'Core\s+i7[\s\-]?4[89]\d{2}[KX]?': ('4th Gen Ivy Bridge-E', 'LGA2011'),
        r'4th\s+Gen.*Core\s+i7[\s\-]?4[89]': ('4th Gen Ivy Bridge-E', 'LGA2011'),
    }

    
    # Spec keys to search for socket information
    SOCKET_SPEC_KEYS = [
        'socket', 'cpu_socket', 'processor_socket', 'socket_type',
        'cpu_socket_type', 'socket_compatibility', 'platform',
    ]
    
    # Spec keys for TDP
    TDP_SPEC_KEYS = [
        'tdp', 'thermal_design_power', 'tdp_watt', 'power', 'tdp_w',
        'processor_tdp', 'default_tdp', 'base_tdp',
    ]
    
    @property
    def component_type(self) -> str:
        return 'cpu'
    
    def extract(
        self,
        title: str,
        specs: Dict[str, Any],
        brand: Optional[str] = None,
    ) -> ExtractionResult:
        """
        Extract CPU compatibility attributes.
        
        Args:
            title: CPU product title
            specs: Raw specs dictionary
            brand: Pre-extracted brand if available
            
        Returns:
            ExtractionResult with cpu_socket, cpu_brand, cpu_generation, cpu_tdp_watts
        """
        attributes = {'component_type': 'cpu'}
        warnings = []
        confidence = 0.0
        source = 'none'
        
        # 1. Extract socket (most important for compatibility)
        socket, socket_conf, socket_src, socket_gen = self._extract_socket(title, specs)
        if socket:
            attributes['cpu_socket'] = socket
            confidence = socket_conf
            source = socket_src
            if socket_gen:
                attributes['cpu_generation'] = socket_gen
        else:
            warnings.append("Could not determine CPU socket")
        
        # 2. Extract brand
        cpu_brand = self._extract_brand(title, brand)
        if cpu_brand:
            attributes['cpu_brand'] = cpu_brand
        else:
            warnings.append("Could not determine CPU brand")
        
        # 3. Extract generation (if not already set from socket inference)
        if 'cpu_generation' not in attributes:
            generation = self._extract_generation(title)
            if generation:
                attributes['cpu_generation'] = generation
        
        # 4. Extract TDP
        tdp = self._extract_tdp(specs, title)
        if tdp:
            attributes['cpu_tdp_watts'] = tdp
        
        return ExtractionResult(
            attributes=attributes,
            confidence=confidence,
            source=source,
            warnings=warnings,
        )
    
    def _extract_socket(
        self,
        title: str,
        specs: Dict[str, Any],
    ) -> Tuple[Optional[str], float, str, Optional[str]]:
        """
        Extract CPU socket with confidence, source, and optional generation.
        
        Returns:
            Tuple of (socket, confidence, source, generation)
        """
        # Try specs first (highest confidence)
        socket_val = self._find_spec_value(specs, self.SOCKET_SPEC_KEYS)
        
        if socket_val:
            for pattern, socket_name in self.SOCKET_PATTERNS:
                match = re.search(pattern, socket_val, re.IGNORECASE)
                if match:
                    result_socket = socket_name
                    if result_socket is None and match.lastindex:
                        # Use capture group
                        result_socket = match.group(1).upper().replace(' ', '').replace('-', '')
                    if result_socket:
                        return (result_socket, 0.95, 'specs', None)
        
        # Try title (medium-high confidence)
        for pattern, socket_name in self.SOCKET_PATTERNS:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                result_socket = socket_name
                if result_socket is None and match.lastindex:
                    result_socket = match.group(1).upper().replace(' ', '').replace('-', '')
                if result_socket:
                    return (result_socket, 0.90, 'title', None)
        
        # Infer from CPU generation/model (lower confidence)
        for pattern, (gen_name, inferred_socket) in self.GENERATION_PATTERNS.items():
            if re.search(pattern, title, re.IGNORECASE):
                return (inferred_socket, 0.75, 'inferred', gen_name)
        
        return (None, 0.0, 'none', None)
    
    def _extract_brand(self, title: str, brand: Optional[str]) -> Optional[str]:
        """Extract CPU brand (AMD or Intel)."""
        # Use provided brand if valid
        if brand:
            brand_upper = brand.upper()
            if brand_upper in ('AMD', 'INTEL'):
                return brand_upper
        
        # Extract from title
        title_upper = title.upper()
        
        # AMD indicators
        if any(x in title_upper for x in ['AMD', 'RYZEN', 'THREADRIPPER', 'EPYC', 'ATHLON']):
            return 'AMD'
        
        # Intel indicators
        if any(x in title_upper for x in ['INTEL', 'CORE I', 'CORE ULTRA', 'PENTIUM', 'CELERON', 'XEON']):
            return 'Intel'
        
        return None
    
    def _extract_generation(self, title: str) -> Optional[str]:
        """Extract CPU generation from title."""
        for pattern, (gen_name, _) in self.GENERATION_PATTERNS.items():
            if re.search(pattern, title, re.IGNORECASE):
                return gen_name
        return None
    
    def _extract_tdp(self, specs: Dict[str, Any], title: str) -> Optional[int]:
        """Extract TDP in watts."""
        # Try specs
        tdp_val = self._find_spec_value(specs, self.TDP_SPEC_KEYS)
        
        if tdp_val:
            # Match patterns like "105W", "105 W", "105 Watt"
            match = re.search(r'(\d+)\s*[Ww](?:att)?', tdp_val)
            if match:
                return int(match.group(1))
            # Try just extracting number if key is clearly TDP
            num = self._extract_number(tdp_val)
            if num and 15 <= num <= 500:  # Reasonable TDP range
                return num
        
        # Try title (less common but some products include it)
        match = re.search(r'(\d+)\s*[Ww]\s*TDP', title, re.IGNORECASE)
        if match:
            return int(match.group(1))
        
        return None
