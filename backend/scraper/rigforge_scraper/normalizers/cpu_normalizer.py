"""
CPU Normalizer for extracting processor compatibility attributes.

Extracts socket type, brand, generation, and TDP from CPU product data.
Uses pre-compiled regex patterns for optimal performance.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from .base import BaseNormalizer, ExtractionResult, SpecsDict
from .patterns.cpu_patterns import (
    # Socket patterns
    SOCKET_PATTERNS,
    GENERATION_MAP,
    # Brand detection
    AMD_BRAND_INDICATORS,
    INTEL_BRAND_INDICATORS,
    # Spec keys
    SOCKET_SPEC_KEYS,
    TDP_SPEC_KEYS,
    # CPU name patterns
    INTEL_CORE_PATTERN,
    INTEL_ULTRA_PATTERN,
    RYZEN_PATTERN,
    THREADRIPPER_PATTERN,
    THREADRIPPER_PRO_CHECK,
    XEON_PATTERN,
    EPYC_PATTERN,
    ATHLON_PATTERN,
    AMD_APU_PATTERN,
    OPTERON_PATTERN,
    I7_EXTREME_PATTERN,
    PENTIUM_GOLD_PATTERN,
    CELERON_PATTERN,
    # TDP patterns
    TDP_WATT_PATTERN,
    TDP_TITLE_PATTERN,
    TDP_MIN_WATTS,
    TDP_MAX_WATTS,
)

logger = logging.getLogger(__name__)


class CPUNormalizer(BaseNormalizer):
    """
    Normalizer for extracting CPU compatibility attributes.
    
    Extracts:
        - cpu_socket: AM4, AM5, LGA1700, etc.
        - cpu_brand: AMD or Intel
        - cpu_generation: Ryzen 5000, Raptor Lake, etc.
        - cpu_tdp_watts: TDP in watts
        - canonical_cpu_name: Normalized CPU model for dataset matching
    
    Example:
        >>> normalizer = CPUNormalizer()
        >>> result = normalizer.extract(
        ...     title="AMD Ryzen 7 5800X Processor",
        ...     specs={"Socket": "AM4", "TDP": "105W"},
        ... )
        >>> print(result.attributes['cpu_socket'])
        'AM4'
    """
    
    @property
    def component_type(self) -> str:
        return 'cpu'
    
    def extract(
        self,
        title: str,
        specs: SpecsDict,
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
        attributes: Dict[str, Any] = {'component_type': 'cpu'}
        warnings: List[str] = []
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
            self._log_extraction('cpu_socket', socket, socket_src, socket_conf)
        else:
            warnings.append("Could not determine CPU socket")
        
        # 2. Extract brand
        cpu_brand = self._extract_brand(title, brand)
        if cpu_brand:
            attributes['cpu_brand'] = cpu_brand
            self._log_extraction('cpu_brand', cpu_brand, 'title', 0.95)
        else:
            warnings.append("Could not determine CPU brand")
        
        # 3. Extract generation (if not already set from socket inference)
        if 'cpu_generation' not in attributes:
            generation = self._extract_generation(title)
            if generation:
                attributes['cpu_generation'] = generation
                self._log_extraction('cpu_generation', generation, 'title', 0.85)
        
        # 4. Extract TDP
        tdp = self._extract_tdp(specs, title)
        if tdp:
            attributes['cpu_tdp_watts'] = tdp
            self._log_extraction('cpu_tdp_watts', tdp, 'specs', 0.90)
        
        # 5. Extract canonical CPU name for dataset matching
        canonical_name = self._normalize_cpu_name(title)
        if canonical_name:
            attributes['canonical_cpu_name'] = canonical_name
        
        return ExtractionResult(
            attributes=attributes,
            confidence=confidence,
            source=source,
            warnings=tuple(warnings),
        )
    
    def _extract_socket(
        self,
        title: str,
        specs: SpecsDict,
    ) -> Tuple[Optional[str], float, str, Optional[str]]:
        """
        Extract CPU socket with confidence, source, and optional generation.
        
        Priority:
            1. Explicit socket in specs (highest confidence)
            2. Socket mentioned in title
            3. Inferred from CPU generation/model (lower confidence)
        
        Returns:
            Tuple of (socket, confidence, source, generation)
        """
        # Try specs first (highest confidence)
        socket_values = self._find_spec_values(specs, SOCKET_SPEC_KEYS)
        for socket_val in socket_values:
            for pattern, socket_name in SOCKET_PATTERNS:
                if pattern.search(socket_val):
                    return (socket_name, 0.95, 'specs', None)
        
        # Try title (medium-high confidence)
        for pattern, socket_name in SOCKET_PATTERNS:
            if pattern.search(title):
                return (socket_name, 0.90, 'title', None)
        
        # Infer from CPU generation/model (lower confidence)
        for pattern, (gen_name, inferred_socket) in GENERATION_MAP.items():
            if pattern.search(title):
                return (inferred_socket, 0.75, 'inferred', gen_name)
        
        return (None, 0.0, 'none', None)
    
    def _extract_brand(self, title: str, brand: Optional[str]) -> Optional[str]:
        """
        Extract CPU brand (AMD or Intel).
        
        Args:
            title: Product title
            brand: Pre-extracted brand hint
            
        Returns:
            'AMD' or 'Intel' or None
        """
        # Use provided brand if valid
        if brand:
            brand_upper = brand.upper()
            if brand_upper == 'AMD':
                return 'AMD'
            if brand_upper == 'INTEL':
                return 'Intel'
        
        # Extract from title
        title_upper = title.upper()
        
        # Check AMD indicators
        if any(indicator in title_upper for indicator in AMD_BRAND_INDICATORS):
            return 'AMD'
        
        # Check Intel indicators
        if any(indicator in title_upper for indicator in INTEL_BRAND_INDICATORS):
            return 'Intel'
        
        return None
    
    def _extract_generation(self, title: str) -> Optional[str]:
        """
        Extract CPU generation from title.
        
        Returns:
            Generation string like "Ryzen 5000", "13th Gen Raptor Lake", etc.
        """
        for pattern, (gen_name, _socket) in GENERATION_MAP.items():
            if pattern.search(title):
                return gen_name
        return None
    
    def _extract_tdp(self, specs: SpecsDict, title: str) -> Optional[int]:
        """
        Extract TDP in watts.
        
        Args:
            specs: Specs dictionary
            title: Product title (fallback)
            
        Returns:
            TDP in watts or None
        """
        # Try specs first
        tdp_values = self._find_spec_values(specs, TDP_SPEC_KEYS)
        for tdp_val in tdp_values:
            # Match patterns like "105W", "105 W", "105 Watt"
            match = TDP_WATT_PATTERN.search(tdp_val)
            if match:
                tdp = int(match.group(1))
                if TDP_MIN_WATTS <= tdp <= TDP_MAX_WATTS:
                    return tdp
            
            # Try just extracting number if key is clearly TDP
            num = self._extract_number(tdp_val)
            if num and TDP_MIN_WATTS <= num <= TDP_MAX_WATTS:
                return num
        
        # Try title (less common but some products include it)
        match = TDP_TITLE_PATTERN.search(title)
        if match:
            tdp = int(match.group(1))
            if TDP_MIN_WATTS <= tdp <= TDP_MAX_WATTS:
                return tdp
        
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
            - "Intel® Pentium® Gold G6400 Processor" -> "Pentium G6400"
        
        Args:
            title: CPU product title
            
        Returns:
            Normalized CPU name or None if no pattern matched
        """
        if not title:
            return None
        
        # Clean title: remove trademark/registered symbols that break patterns
        # ® (registered), ™ (trademark), © (copyright)
        title = title.replace('®', ' ').replace('™', ' ').replace('©', ' ')
        # Normalize multiple spaces to single space
        title = ' '.join(title.split())
        
        # Pattern 1: Intel Core iX-XXXXX (with hyphen)
        # Matches: i5-11500, i7-14700K, i9-13900KS, i3-12100F
        match = INTEL_CORE_PATTERN.search(title)
        if match:
            tier = match.group(1).lower()
            model = match.group(2)
            suffix = match.group(3).upper() if match.group(3) else ''
            return f"{tier}-{model}{suffix}"
        
        # Pattern 1b: Intel Core Ultra X XXXK (Arrow Lake)
        # Matches: Core Ultra 5 245K, Core Ultra 7 265K, Core Ultra 9 285K
        match = INTEL_ULTRA_PATTERN.search(title)
        if match:
            tier = match.group(1)
            model = match.group(2)
            suffix = match.group(3).upper() if match.group(3) else ''
            return f"Ultra {tier} {model}{suffix}"
        
        # Pattern 2: AMD Ryzen X XXXXG/X/F/GT/X3D
        # Matches: Ryzen 5 5600G, Ryzen 7 7800X3D, Ryzen 9 7950X
        match = RYZEN_PATTERN.search(title)
        if match:
            tier = match.group(1)
            model = match.group(2)
            suffix = match.group(3).upper() if match.group(3) else ''
            return f"Ryzen {tier} {model}{suffix}"
        
        # Pattern 3: AMD Ryzen Threadripper
        # Matches: Threadripper 3970X, Threadripper PRO 5995WX
        match = THREADRIPPER_PATTERN.search(title)
        if match:
            model = match.group(1)
            if THREADRIPPER_PRO_CHECK.search(title):
                return f"Threadripper PRO {model}WX"
            return f"Threadripper {model}X"
        
        # Pattern 4: Intel Xeon E5/E3/W/Platinum/Gold/Silver/Bronze
        # Matches: Xeon E5-2660, Xeon E3-1245 V5, Xeon W-3175X
        match = XEON_PATTERN.search(title)
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
        match = EPYC_PATTERN.search(title)
        if match:
            model = match.group(1)
            return f"EPYC {model}"
        
        # Pattern 6: AMD Athlon
        # Matches: Athlon 3000G, Athlon 200GE
        match = ATHLON_PATTERN.search(title)
        if match:
            model = match.group(1)
            suffix = match.group(2).upper() if match.group(2) else ''
            return f"Athlon {model}{suffix}"
        
        # Pattern 7: AMD A-series APU
        # Matches: A6 7470K, A8 7670K, A10 7850K
        match = AMD_APU_PATTERN.search(title)
        if match:
            tier = match.group(1)
            model = match.group(2)
            return f"A{tier}-{model}"
        
        # Pattern 8: AMD Opteron
        # Matches: Opteron 6344, Opteron 2356
        match = OPTERON_PATTERN.search(title)
        if match:
            model = match.group(1)
            return f"Opteron {model}"
        
        # Pattern 9: Intel i7 Extreme
        # Matches: i7 Extreme 6950X
        match = I7_EXTREME_PATTERN.search(title)
        if match:
            model = match.group(1)
            return f"i7-{model}X"
        
        # Pattern 10: Intel Pentium Gold
        # Matches: Pentium Gold G6400, Pentium Gold G6405
        match = PENTIUM_GOLD_PATTERN.search(title)
        if match:
            model = match.group(1).upper()
            return f"Pentium {model}"
        
        # Pattern 11: Intel Celeron
        # Matches: Celeron G5900, Celeron G6900
        match = CELERON_PATTERN.search(title)
        if match:
            model = match.group(1).upper()
            return f"Celeron {model}"
        
        return None
    
    def normalize_name(self, title: str) -> Optional[str]:
        """
        Public method to normalize a CPU name for dataset matching.
        
        This is the public interface for name normalization, suitable for
        use by external code like management commands.
        
        Args:
            title: CPU product title or name
            
        Returns:
            Normalized CPU name or None if no pattern matched
            
        Example:
            >>> normalizer = CPUNormalizer()
            >>> normalizer.normalize_name('Intel Core i5-14400F Processor')
            'i5-14400F'
        """
        return self._normalize_cpu_name(title)
