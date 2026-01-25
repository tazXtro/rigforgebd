"""
CPU Normalizer for extracting processor compatibility attributes.

Extracts socket type, brand, generation, and TDP from CPU product data.
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple

from .base import BaseNormalizer, ExtractionResult
from .data_loader import load_normalizer_data

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
    
    DATA = load_normalizer_data("cpu")
    SOCKET_PATTERNS = [
        (item["pattern"], item.get("socket"))
        for item in DATA.get("socket_patterns", [])
    ]
    GENERATION_PATTERNS = DATA.get("generation_patterns", [])
    SOCKET_SPEC_KEYS = DATA.get("socket_spec_keys", [])
    TDP_SPEC_KEYS = DATA.get("tdp_spec_keys", [])
    
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
            ExtractionResult with cpu_socket, cpu_brand, cpu_generation, 
            cpu_tdp_watts, canonical_cpu_name
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
        
        # 5. Extract canonical CPU name for dataset matching
        canonical_name = self._normalize_cpu_name(title)
        if canonical_name:
            attributes['canonical_cpu_name'] = canonical_name
        
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
        socket_values = self._find_spec_values(specs, self.SOCKET_SPEC_KEYS)
        for socket_val in socket_values:
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
        for item in self.GENERATION_PATTERNS:
            pattern = item.get("pattern")
            gen_name = item.get("generation")
            inferred_socket = item.get("socket")
            if pattern and gen_name and inferred_socket:
                if re.search(pattern, title, re.IGNORECASE):
                    return (inferred_socket, 0.75, 'inferred', gen_name)
        
        return (None, 0.0, 'none', None)
    
    def _extract_brand(self, title: str, brand: Optional[str]) -> Optional[str]:
        """Extract CPU brand (AMD or Intel)."""
        # Use provided brand if valid
        if brand:
            brand_upper = brand.upper()
            if brand_upper == 'AMD':
                return 'AMD'
            if brand_upper == 'INTEL':
                return 'Intel'
        
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
        for item in self.GENERATION_PATTERNS:
            pattern = item.get("pattern")
            gen_name = item.get("generation")
            if pattern and gen_name:
                if re.search(pattern, title, re.IGNORECASE):
                    return gen_name
        return None
    
    def _extract_tdp(self, specs: Dict[str, Any], title: str) -> Optional[int]:
        """Extract TDP in watts."""
        # Try specs
        tdp_values = self._find_spec_values(specs, self.TDP_SPEC_KEYS)
        for tdp_val in tdp_values:
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
    
    def _normalize_cpu_name(self, title: str) -> Optional[str]:
        """
        Extract normalized/canonical CPU name for dataset matching.
        
        Strips marketing terms, generation prefixes, and extra details to get
        a clean model identifier that matches common dataset formats.
        
        Examples:
            - "Intel 11th Gen Core i5-11500 Rocket Lake Processor" -> "i5-11500"
            - "Intel Core i5 4460S 2.9 GHz 4-Core LGA1150" -> "i5-4460S"
            - "AMD Ryzen 5 5600G Processor" -> "Ryzen 5 5600G"
            - "AMD Ryzen 7 7800X3D 8-Core AM5" -> "Ryzen 7 7800X3D"
            - "Intel Xeon E5 1650 V3 OEM/Tray 3.5 GHz" -> "Xeon E5-1650 V3"
        
        Args:
            title: CPU product title
            
        Returns:
            Normalized CPU name or None if no pattern matched
        """
        if not title:
            return None
        
        # Pattern 1: Intel Core iX-XXXXX (with hyphen)
        # Matches: i5-11500, i7-14700K, i9-13900KS, i3-12100F
        match = re.search(
            r'\b(i[3579])[- ]?(\d{4,5})([KFSTX]{0,3})\b',
            title,
            re.IGNORECASE
        )
        if match:
            tier = match.group(1).lower()
            model = match.group(2)
            suffix = match.group(3).upper() if match.group(3) else ''
            return f"{tier}-{model}{suffix}"
        
        # Pattern 1b: Intel Core Ultra X XXXK (Arrow Lake)
        # Matches: Core Ultra 5 245K, Core Ultra 7 265K, Core Ultra 9 285K
        match = re.search(
            r'\bCore\s+Ultra\s+([579])\s+(\d{3})([KFSH]?)\b',
            title,
            re.IGNORECASE
        )
        if match:
            tier = match.group(1)
            model = match.group(2)
            suffix = match.group(3).upper() if match.group(3) else ''
            return f"Ultra {tier} {model}{suffix}"
        
        # Pattern 2: AMD Ryzen X XXXXG/X/F/GT/X3D
        # Matches: Ryzen 5 5600G, Ryzen 7 7800X3D, Ryzen 9 7950X, Ryzen 5 8400F, Ryzen 5 5500GT
        match = re.search(
            r'\bRyzen\s+([3579])\s+(\d{4})(GT|G|X3D|X|F|H)?\b',
            title,
            re.IGNORECASE
        )
        if match:
            tier = match.group(1)
            model = match.group(2)
            suffix = match.group(3).upper() if match.group(3) else ''
            return f"Ryzen {tier} {model}{suffix}"
        
        # Pattern 3: AMD Ryzen Threadripper
        # Matches: Threadripper 3970X, Threadripper PRO 5995WX
        match = re.search(
            r'\bThreadripper(?:\s+PRO)?\s+(\d{4})[WX]?[X]?\b',
            title,
            re.IGNORECASE
        )
        if match:
            model = match.group(1)
            # Check for PRO in title
            if re.search(r'\bPRO\b', title, re.IGNORECASE):
                return f"Threadripper PRO {model}WX"
            return f"Threadripper {model}X"
        
        # Pattern 4: Intel Xeon E5/E3/W/Platinum/Gold/Silver/Bronze
        # Matches: Xeon E5-2660, Xeon E3-1245 V5, Xeon W-3175X
        match = re.search(
            r'\bXeon\s+(E[35]|W|Platinum|Gold|Silver|Bronze)[- ]?(\d{4})[- ]?([VvMmL]?\d?)?\s*([A-Z]?)\b',
            title,
            re.IGNORECASE
        )
        if match:
            series = match.group(1).upper()
            model = match.group(2)
            version = match.group(3).upper() if match.group(3) else ''
            suffix = match.group(4).upper() if match.group(4) else ''
            
            # Format version properly
            if version:
                version = f" {version}" if version.startswith('V') else version
            
            return f"Xeon {series}-{model}{version}{suffix}".strip()
        
        # Pattern 5: AMD EPYC
        # Matches: EPYC 7742, EPYC 9654
        match = re.search(
            r'\bEPYC\s+(\d{4})[P]?\b',
            title,
            re.IGNORECASE
        )
        if match:
            model = match.group(1)
            return f"EPYC {model}"
        
        # Pattern 6: AMD Athlon
        # Matches: Athlon 3000G, Athlon 200GE
        match = re.search(
            r'\bAthlon\s+(\d{3,4})([GE]{0,2})\b',
            title,
            re.IGNORECASE
        )
        if match:
            model = match.group(1)
            suffix = match.group(2).upper() if match.group(2) else ''
            return f"Athlon {model}{suffix}"
        
        # Pattern 7: AMD A-series APU
        # Matches: A6 7470K, A8 7670K, A10 7850K
        match = re.search(
            r'\bA([468]|10|12)[- ]?(\d{4})([K]?)\b',
            title,
            re.IGNORECASE
        )
        if match:
            tier = match.group(1)
            model = match.group(2)
            suffix = match.group(3).upper() if match.group(3) else ''
            return f"A{tier}-{model}{suffix}"
        
        # Pattern 8: AMD Opteron
        # Matches: Opteron 6344, Opteron 2356
        match = re.search(
            r'\bOpteron\s+(\d{4})\b',
            title,
            re.IGNORECASE
        )
        if match:
            model = match.group(1)
            return f"Opteron {model}"
        
        # Pattern 9: Intel Core i7 Extreme
        # Matches: i7 Extreme 6950X
        match = re.search(
            r'\bi7\s+Extreme\s+(\d{4})([X]?)\b',
            title,
            re.IGNORECASE
        )
        if match:
            model = match.group(1)
            suffix = match.group(2).upper() if match.group(2) else 'X'
            return f"i7-{model}{suffix}"
        
        # Pattern 10: Intel Pentium Gold
        # Matches: Pentium Gold G6400, Pentium Gold G6405
        match = re.search(
            r'\bPentium\s+Gold\s+(G\d{4})\b',
            title,
            re.IGNORECASE
        )
        if match:
            model = match.group(1).upper()
            return f"Pentium {model}"
        
        # Pattern 11: Intel Celeron
        # Matches: Celeron G5900, Celeron G6900
        match = re.search(
            r'\bCeleron\s+(G\d{4})\b',
            title,
            re.IGNORECASE
        )
        if match:
            model = match.group(1).upper()
            return f"Celeron {model}"
        
        return None

