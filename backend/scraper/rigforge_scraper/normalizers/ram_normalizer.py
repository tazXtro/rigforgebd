"""
RAM Normalizer for extracting memory compatibility attributes.

Extracts DDR type, speed, capacity, and module configuration from
RAM/memory product data.
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple

from .base import BaseNormalizer, ExtractionResult

logger = logging.getLogger(__name__)


class RAMNormalizer(BaseNormalizer):
    """
    Normalizer for extracting RAM/memory compatibility attributes.
    
    Extracts:
        - memory_type: DDR4, DDR5
        - memory_speed_mhz: Actual/rated speed (e.g., 3200, 6000)
        - memory_capacity_gb: Total kit capacity
        - memory_modules: Number of modules in kit (e.g., 2 for 2x8GB)
        - memory_ecc_support: Whether ECC is supported
    """
    
    # DDR type patterns
    DDR_PATTERNS = [
        (r'\bDDR5\b', 'DDR5'),
        (r'\bDDR4\b', 'DDR4'),
        (r'\bDDR3\b', 'DDR3'),
    ]
    
    # Speed patterns for different notations
    SPEED_PATTERNS = [
        # DDR5-6000, DDR4-3200 format
        r'DDR[45][\s\-](\d{4,5})',
        # PC5-48000 format (divide by 8 for MT/s)
        r'PC[45][\s\-](\d{5})',
        # Plain MHz: 6000MHz, 3200 MHz
        r'(\d{4,5})\s*(?:MHz|MT/s)',
        # Speed in specs
        r'(?:speed|frequency|clock)[:\s]*(\d{4,5})',
    ]
    
    # Capacity patterns
    CAPACITY_PATTERNS = [
        # Kit format: 32GB (2x16GB), 16GB (2x8GB)
        r'(\d+)\s*GB\s*\(\s*(\d+)\s*x\s*(\d+)\s*GB\s*\)',
        # Simple format: 16GB, 32 GB
        r'(\d+)\s*GB',
    ]
    
    # Module count patterns
    MODULE_PATTERNS = [
        r'(\d+)\s*x\s*\d+\s*GB',  # 2x8GB, 2 x 16GB
        r'\((\d+)\s*x\s*\d+\s*GB\)',  # (2x8GB)
        r'(\d+)\s*Pack',  # 2-Pack
        r'Dual\s*(?:Channel|Kit)',  # Dual Channel = 2
        r'Quad\s*(?:Channel|Kit)',  # Quad Channel = 4
    ]
    
    # Spec keys
    MEMORY_TYPE_SPEC_KEYS = [
        'memory_type', 'type', 'ddr', 'ram_type', 'technology',
    ]
    
    MEMORY_SPEED_SPEC_KEYS = [
        'speed', 'frequency', 'clock', 'memory_speed', 'ram_speed',
        'data_rate', 'transfer_rate', 'mhz', 'mt_s',
    ]
    
    MEMORY_CAPACITY_SPEC_KEYS = [
        'capacity', 'size', 'memory_size', 'total_capacity',
        'kit_capacity', 'ram_size', 'memory_capacity',
    ]
    
    MEMORY_MODULES_SPEC_KEYS = [
        'modules', 'sticks', 'dimms', 'pieces', 'quantity',
        'kit_type', 'configuration', 'module_count',
    ]
    
    @property
    def component_type(self) -> str:
        return 'ram'
    
    def extract(
        self,
        title: str,
        specs: Dict[str, Any],
        brand: Optional[str] = None,
    ) -> ExtractionResult:
        """
        Extract RAM compatibility attributes.
        
        Args:
            title: RAM product title
            specs: Raw specs dictionary
            brand: Pre-extracted brand (not used for RAM)
            
        Returns:
            ExtractionResult with memory_type, memory_speed_mhz, etc.
        """
        attributes = {'component_type': 'ram'}
        warnings = []
        confidence = 0.0
        source = 'none'
        
        # 1. Extract DDR type (most important for compatibility)
        ddr_type, ddr_conf, ddr_src = self._extract_ddr_type(title, specs)
        if ddr_type:
            attributes['memory_type'] = ddr_type
            confidence = ddr_conf
            source = ddr_src
        else:
            warnings.append("Could not determine DDR type")
        
        # 2. Extract speed
        speed, speed_src = self._extract_speed(title, specs)
        if speed:
            # Use max_speed for RAM modules (actual rated speed)
            attributes['memory_max_speed_mhz'] = speed
            if speed_src == 'specs' and confidence < 0.95:
                confidence = 0.90
        else:
            warnings.append("Could not determine memory speed")
        
        # 3. Extract capacity and module configuration
        capacity, modules = self._extract_capacity_and_modules(title, specs)
        if capacity:
            attributes['memory_capacity_gb'] = capacity
        if modules:
            attributes['memory_modules'] = modules
        
        # 4. Check for ECC
        ecc = self._extract_ecc(title, specs)
        if ecc is not None:
            attributes['memory_ecc_support'] = ecc
        
        return ExtractionResult(
            attributes=attributes,
            confidence=confidence,
            source=source,
            warnings=warnings,
        )
    
    def _extract_ddr_type(
        self,
        title: str,
        specs: Dict[str, Any],
    ) -> Tuple[Optional[str], float, str]:
        """Extract DDR type with confidence."""
        # Try specs first
        type_val = self._find_spec_value(specs, self.MEMORY_TYPE_SPEC_KEYS)
        
        if type_val:
            for pattern, ddr_name in self.DDR_PATTERNS:
                if re.search(pattern, type_val, re.IGNORECASE):
                    return (ddr_name, 0.95, 'specs')
        
        # Try title
        for pattern, ddr_name in self.DDR_PATTERNS:
            if re.search(pattern, title, re.IGNORECASE):
                return (ddr_name, 0.90, 'title')
        
        # Infer from speed (DDR5 typically 4800+, DDR4 typically 2133-3600)
        speed, _ = self._extract_speed(title, specs)
        if speed:
            if speed >= 4800:
                return ('DDR5', 0.70, 'inferred')
            elif speed >= 2133:
                return ('DDR4', 0.65, 'inferred')
        
        return (None, 0.0, 'none')
    
    def _extract_speed(
        self,
        title: str,
        specs: Dict[str, Any],
    ) -> Tuple[Optional[int], str]:
        """Extract memory speed in MHz."""
        # Try specs
        speed_val = self._find_spec_value(specs, self.MEMORY_SPEED_SPEC_KEYS)
        
        if speed_val:
            for pattern in self.SPEED_PATTERNS:
                match = re.search(pattern, speed_val, re.IGNORECASE)
                if match:
                    speed = int(match.group(1))
                    # PC5 format: divide by 8
                    if 'PC' in pattern and speed > 10000:
                        speed = speed // 8
                    if 1600 <= speed <= 10000:
                        return (speed, 'specs')
        
        # Try title
        for pattern in self.SPEED_PATTERNS:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                speed = int(match.group(1))
                if 'PC' in pattern and speed > 10000:
                    speed = speed // 8
                if 1600 <= speed <= 10000:
                    return (speed, 'title')
        
        return (None, 'none')
    
    def _extract_capacity_and_modules(
        self,
        title: str,
        specs: Dict[str, Any],
    ) -> Tuple[Optional[int], Optional[int]]:
        """Extract total capacity and module count."""
        capacity = None
        modules = None
        
        # Try specs for capacity
        cap_val = self._find_spec_value(specs, self.MEMORY_CAPACITY_SPEC_KEYS)
        if cap_val:
            match = re.search(r'(\d+)\s*GB', cap_val, re.IGNORECASE)
            if match:
                capacity = int(match.group(1))
        
        # Try specs for module count
        mod_val = self._find_spec_value(specs, self.MEMORY_MODULES_SPEC_KEYS)
        if mod_val:
            num = self._extract_number(mod_val)
            if num and 1 <= num <= 8:
                modules = num
        
        # Parse title for kit format: 32GB (2x16GB)
        kit_match = re.search(
            r'(\d+)\s*GB\s*\(\s*(\d+)\s*x\s*(\d+)\s*GB\s*\)',
            title,
            re.IGNORECASE
        )
        if kit_match:
            total = int(kit_match.group(1))
            mod_count = int(kit_match.group(2))
            per_module = int(kit_match.group(3))
            
            # Validate: total should roughly equal modules * per_module
            if abs(total - (mod_count * per_module)) <= 1:
                capacity = total
                modules = mod_count
        elif not capacity:
            # Simple capacity from title: 16GB
            match = re.search(r'(\d+)\s*GB', title, re.IGNORECASE)
            if match:
                capacity = int(match.group(1))
        
        # Extract module count from title if not found
        if not modules:
            for pattern in self.MODULE_PATTERNS:
                match = re.search(pattern, title, re.IGNORECASE)
                if match:
                    if 'Dual' in pattern:
                        modules = 2
                    elif 'Quad' in pattern:
                        modules = 4
                    else:
                        modules = int(match.group(1))
                    break
        
        return (capacity, modules)
    
    def _extract_ecc(
        self,
        title: str,
        specs: Dict[str, Any],
    ) -> Optional[bool]:
        """Extract ECC support flag."""
        combined = self._combine_text_sources(title, specs).upper()
        
        # Check for explicit ECC mentions
        if 'NON-ECC' in combined or 'NON ECC' in combined:
            return False
        if 'ECC' in combined:
            return True
        
        # Most consumer RAM is non-ECC
        return None
