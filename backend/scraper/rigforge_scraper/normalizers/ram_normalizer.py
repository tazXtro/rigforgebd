"""
RAM Normalizer for extracting memory compatibility attributes.

Extracts DDR type, speed, capacity, and module configuration from
RAM/memory product data.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from .base import BaseNormalizer, ExtractionResult, SpecsDict
from .patterns.ram_patterns import (
    # DDR patterns
    DDR_PATTERNS,
    # Speed patterns
    SPEED_PATTERNS,
    PC_FORMAT_PATTERN,
    # Capacity patterns
    KIT_CAPACITY_PATTERN,
    SPEC_KIT_PATTERN,
    SIMPLE_CAPACITY_PATTERN,
    # Module patterns
    MODULE_COUNT_PATTERNS,
    # Spec keys
    MEMORY_TYPE_SPEC_KEYS,
    MEMORY_SPEED_SPEC_KEYS,
    MEMORY_CAPACITY_SPEC_KEYS,
    MEMORY_MODULES_SPEC_KEYS,
    # Thresholds
    DDR5_MIN_SPEED,
    DDR4_MIN_SPEED,
    DDR4_MAX_SPEED,
    DDR_INFERENCE_CONFIDENCE,
    # Validation
    MIN_MEMORY_SPEED_MHZ,
    MAX_MEMORY_SPEED_MHZ,
    MIN_MODULE_COUNT,
    MAX_MODULE_COUNT,
    # ECC patterns
    NON_ECC_PATTERN,
    ECC_PATTERN,
    REGISTERED_PATTERN,
)

logger = logging.getLogger(__name__)


class RAMNormalizer(BaseNormalizer):
    """
    Normalizer for extracting RAM/memory compatibility attributes.
    
    Extracts:
        - memory_type: DDR4, DDR5
        - memory_max_speed_mhz: Actual/rated speed (e.g., 3200, 6000)
        - memory_capacity_gb: Total kit capacity
        - memory_modules: Number of modules in kit (e.g., 2 for 2x8GB)
        - memory_ecc_support: Whether ECC is supported
    
    Example:
        >>> normalizer = RAMNormalizer()
        >>> result = normalizer.extract(
        ...     title="G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5 6000MHz",
        ...     specs={"Type": "DDR5", "Capacity": "32GB"},
        ... )
        >>> print(result.attributes['memory_type'])
        'DDR5'
    """
    
    @property
    def component_type(self) -> str:
        return 'ram'
    
    def extract(
        self,
        title: str,
        specs: SpecsDict,
        brand: Optional[str] = None,
    ) -> ExtractionResult:
        """
        Extract RAM compatibility attributes.
        
        Args:
            title: RAM product title
            specs: Raw specs dictionary
            brand: Pre-extracted brand (not typically used for RAM)
            
        Returns:
            ExtractionResult with memory_type, memory_max_speed_mhz, etc.
        """
        attributes: Dict[str, Any] = {'component_type': 'ram'}
        warnings: List[str] = []
        confidence = 0.0
        source = 'none'
        
        # 1. Extract DDR type (most important for compatibility)
        ddr_type, ddr_conf, ddr_src = self._extract_ddr_type(title, specs)
        if ddr_type:
            attributes['memory_type'] = ddr_type
            confidence = ddr_conf
            source = ddr_src
            self._log_extraction('memory_type', ddr_type, ddr_src, ddr_conf)
        else:
            warnings.append("Could not determine DDR type")
        
        # 2. Extract speed
        speed, speed_src = self._extract_speed(title, specs)
        if speed:
            # Use max_speed for RAM modules (actual rated speed)
            attributes['memory_max_speed_mhz'] = speed
            self._log_extraction('memory_max_speed_mhz', speed, speed_src, 0.90)
            # Boost confidence if we found speed
            if speed_src == 'specs' and confidence < 0.95:
                confidence = max(confidence, 0.90)
        else:
            warnings.append("Could not determine memory speed")
        
        # 3. Extract capacity and module configuration
        capacity, modules = self._extract_capacity_and_modules(title, specs)
        if capacity:
            attributes['memory_capacity_gb'] = capacity
            self._log_extraction('memory_capacity_gb', capacity, 'detected', 0.90)
        if modules:
            attributes['memory_modules'] = modules
            self._log_extraction('memory_modules', modules, 'detected', 0.85)
        
        # 4. Check for ECC
        ecc = self._extract_ecc(title, specs)
        if ecc is not None:
            attributes['memory_ecc_support'] = ecc
            self._log_extraction('memory_ecc_support', ecc, 'detected', 0.90)
        
        return ExtractionResult(
            attributes=attributes,
            confidence=confidence,
            source=source,
            warnings=tuple(warnings),
        )
    
    def _extract_ddr_type(
        self,
        title: str,
        specs: SpecsDict,
    ) -> Tuple[Optional[str], float, str]:
        """
        Extract DDR type with confidence.
        
        Priority:
            1. Explicit DDR type in specs (0.95 confidence)
            2. DDR type in title (0.90 confidence)
            3. Inferred from speed (0.70 confidence)
        
        Returns:
            Tuple of (ddr_type, confidence, source)
        """
        # Try specs first
        type_val = self._find_spec_value(specs, MEMORY_TYPE_SPEC_KEYS)
        
        if type_val:
            for pattern, ddr_name in DDR_PATTERNS:
                if pattern.search(type_val):
                    return (ddr_name, 0.95, 'specs')
        
        # Try title
        for pattern, ddr_name in DDR_PATTERNS:
            if pattern.search(title):
                return (ddr_name, 0.90, 'title')
        
        # Infer from speed
        speed, _ = self._extract_speed(title, specs)
        if speed:
            if speed >= DDR5_MIN_SPEED:
                return ('DDR5', DDR_INFERENCE_CONFIDENCE, 'inferred')
            elif speed >= DDR4_MIN_SPEED and speed < DDR4_MAX_SPEED:
                return ('DDR4', DDR_INFERENCE_CONFIDENCE - 0.05, 'inferred')
            elif speed < DDR4_MIN_SPEED:
                return ('DDR3', DDR_INFERENCE_CONFIDENCE - 0.10, 'inferred')
        
        return (None, 0.0, 'none')
    
    def _extract_speed(
        self,
        title: str,
        specs: SpecsDict,
    ) -> Tuple[Optional[int], str]:
        """
        Extract memory speed in MHz.
        
        Handles various formats:
            - DDR5-6000
            - PC5-48000 (divides by 8)
            - 6000MHz
            - 6000 MT/s
        
        Returns:
            Tuple of (speed_mhz, source)
        """
        # Try specs first
        speed_values = self._find_spec_values(specs, MEMORY_SPEED_SPEC_KEYS)
        for speed_val in speed_values:
            speed = self._parse_speed_value(speed_val)
            if speed and MIN_MEMORY_SPEED_MHZ <= speed <= MAX_MEMORY_SPEED_MHZ:
                return (speed, 'specs')
        
        # Try title
        speed = self._parse_speed_value(title)
        if speed and MIN_MEMORY_SPEED_MHZ <= speed <= MAX_MEMORY_SPEED_MHZ:
            return (speed, 'title')
        
        return (None, 'none')
    
    def _parse_speed_value(self, text: str) -> Optional[int]:
        """
        Parse speed from text, handling various formats.
        
        Args:
            text: Text containing speed information
            
        Returns:
            Speed in MHz or None
        """
        if not text:
            return None
        
        for pattern in SPEED_PATTERNS:
            match = pattern.search(text)
            if match:
                speed = int(match.group(1))
                
                # Check if PC format (PC5-48000 = 6000 MHz)
                # PC format uses bandwidth, divide by 8 for speed
                if PC_FORMAT_PATTERN.search(text) and speed > 10000:
                    speed = speed // 8
                
                return speed
        
        return None
    
    def _extract_capacity_and_modules(
        self,
        title: str,
        specs: SpecsDict,
    ) -> Tuple[Optional[int], Optional[int]]:
        """
        Extract total capacity and module count.
        
        Handles formats:
            - 32GB (2x16GB) - kit format in title
            - 2 x 16GB - spec format
            - 32GB - simple capacity
            - Dual Channel Kit
        
        Returns:
            Tuple of (capacity_gb, module_count)
        """
        capacity: Optional[int] = None
        modules: Optional[int] = None
        
        # Try kit format in title first: 32GB (2x16GB)
        kit_match = KIT_CAPACITY_PATTERN.search(title)
        if kit_match:
            total = int(kit_match.group(1))
            mod_count = int(kit_match.group(2))
            per_module = int(kit_match.group(3))
            
            # Validate: total should roughly equal modules * per_module
            expected = mod_count * per_module
            if abs(total - expected) <= 1:  # Allow small rounding errors
                capacity = total
                modules = mod_count
        
        # Try specs for capacity
        if capacity is None:
            cap_val = self._find_spec_value(specs, MEMORY_CAPACITY_SPEC_KEYS)
            if cap_val:
                # Try kit format in specs
                spec_kit_match = SPEC_KIT_PATTERN.search(cap_val)
                if spec_kit_match:
                    mod_count = int(spec_kit_match.group(1))
                    per_module = int(spec_kit_match.group(2))
                    capacity = mod_count * per_module
                    modules = mod_count
                else:
                    # Simple capacity
                    simple_match = SIMPLE_CAPACITY_PATTERN.search(cap_val)
                    if simple_match:
                        capacity = int(simple_match.group(1))
        
        # Fallback: simple capacity from title
        if capacity is None:
            simple_match = SIMPLE_CAPACITY_PATTERN.search(title)
            if simple_match:
                capacity = int(simple_match.group(1))
        
        # Try specs for module count
        if modules is None:
            mod_val = self._find_spec_value(specs, MEMORY_MODULES_SPEC_KEYS)
            if mod_val:
                num = self._extract_number(mod_val)
                if num and MIN_MODULE_COUNT <= num <= MAX_MODULE_COUNT:
                    modules = num
        
        # Extract module count from title patterns if not found
        if modules is None:
            modules = self._extract_module_count_from_title(title)
        
        return (capacity, modules)
    
    def _extract_module_count_from_title(self, title: str) -> Optional[int]:
        """
        Extract module count from title using various patterns.
        
        Args:
            title: Product title
            
        Returns:
            Module count or None
        """
        for pattern, fixed_count in MODULE_COUNT_PATTERNS:
            match = pattern.search(title)
            if match:
                if fixed_count > 0:
                    # Pattern has fixed count (Dual Channel = 2, Quad = 4)
                    return fixed_count
                else:
                    # Extract count from match group
                    try:
                        count = int(match.group(1))
                        if MIN_MODULE_COUNT <= count <= MAX_MODULE_COUNT:
                            return count
                    except (IndexError, ValueError):
                        continue
        
        return None
    
    def _extract_ecc(
        self,
        title: str,
        specs: SpecsDict,
    ) -> Optional[bool]:
        """
        Extract ECC support flag.
        
        Returns:
            True if ECC, False if non-ECC, None if unknown
        """
        combined = self._combine_text_sources(title, specs)
        
        # Check for explicit non-ECC first
        if NON_ECC_PATTERN.search(combined):
            return False
        
        # Check for ECC mentions
        if ECC_PATTERN.search(combined):
            return True
        
        # Check for registered DIMM (typically ECC)
        if REGISTERED_PATTERN.search(combined):
            return True
        
        # Most consumer RAM is non-ECC, but don't assume
        return None
