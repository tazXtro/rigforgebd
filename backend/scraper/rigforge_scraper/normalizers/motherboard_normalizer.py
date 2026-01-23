"""
Motherboard Normalizer for extracting compatibility attributes.

Extracts socket type, chipset, form factor, and memory support from
motherboard product data.
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple

from .base import BaseNormalizer, ExtractionResult

logger = logging.getLogger(__name__)


class MotherboardNormalizer(BaseNormalizer):
    """
    Normalizer for extracting motherboard compatibility attributes.
    
    Extracts:
        - mobo_socket: AM4, AM5, LGA1700, etc.
        - mobo_chipset: B550, X670, Z790, etc.
        - mobo_form_factor: ATX, Micro-ATX, Mini-ITX, etc.
        - memory_type: DDR4, DDR5
        - memory_slots: Number of DIMM slots
        - memory_max_speed_mhz: Maximum supported memory speed
        - memory_max_capacity_gb: Maximum supported memory capacity
    """
    
    # Chipset to socket mapping for inference
    CHIPSET_TO_SOCKET = {
        # AMD AM4 chipsets
        'A320': 'AM4', 'B350': 'AM4', 'X370': 'AM4',
        'B450': 'AM4', 'X470': 'AM4',
        'A520': 'AM4', 'B550': 'AM4', 'X570': 'AM4',
        
        # AMD AM5 chipsets
        'A620': 'AM5', 'B650': 'AM5', 'B650E': 'AM5',
        'B850': 'AM5', 'B850E': 'AM5',
        'X670': 'AM5', 'X670E': 'AM5',
        'X870': 'AM5', 'X870E': 'AM5',
        
        # AMD Threadripper (sTRX4/sWRX8)
        'TRX40': 'sTRX4', 'WRX80': 'sWRX8',
        
        # Intel LGA1200 chipsets (10th/11th Gen)
        'H410': 'LGA1200', 'B460': 'LGA1200', 'H470': 'LGA1200', 'Z490': 'LGA1200',
        'H510': 'LGA1200', 'B560': 'LGA1200', 'H570': 'LGA1200', 'Z590': 'LGA1200',
        
        # Intel LGA1700 chipsets (12th/13th/14th Gen)
        'H610': 'LGA1700', 'B660': 'LGA1700', 'H670': 'LGA1700', 'Z690': 'LGA1700',
        'B760': 'LGA1700', 'H770': 'LGA1700', 'Z790': 'LGA1700',
        
        # Intel LGA1851 chipsets (Arrow Lake / Core Ultra 200)
        'Z890': 'LGA1851', 'B860': 'LGA1851', 'H810': 'LGA1851',
        
        # Intel LGA1151 chipsets (6th-9th Gen)
        'H110': 'LGA1151', 'B150': 'LGA1151', 'H170': 'LGA1151', 'Z170': 'LGA1151',
        'B250': 'LGA1151', 'H270': 'LGA1151', 'Z270': 'LGA1151',
        'H310': 'LGA1151', 'B360': 'LGA1151', 'H370': 'LGA1151', 'Z370': 'LGA1151',
        'B365': 'LGA1151', 'Z390': 'LGA1151',
        
        # Intel HEDT (LGA2066)
        'X299': 'LGA2066',
    }
    
    # Chipset to default DDR type (for newer platforms)
    CHIPSET_TO_DDR = {
        # AM5 is DDR5 only
        'A620': 'DDR5', 'B650': 'DDR5', 'B650E': 'DDR5',
        'B850': 'DDR5', 'B850E': 'DDR5',
        'X670': 'DDR5', 'X670E': 'DDR5', 'X870': 'DDR5', 'X870E': 'DDR5',
        
        # LGA1851 is DDR5 only
        'Z890': 'DDR5', 'B860': 'DDR5', 'H810': 'DDR5',
        
        # LGA1700 can be DDR4 or DDR5 (need to check specs)
        # AM4 is DDR4 only
        'A320': 'DDR4', 'B350': 'DDR4', 'X370': 'DDR4',
        'B450': 'DDR4', 'X470': 'DDR4',
        'A520': 'DDR4', 'B550': 'DDR4', 'X570': 'DDR4',
    }
    
    # Socket patterns
    SOCKET_PATTERNS = [
        (r'\bAM5\b', 'AM5'),
        (r'\bAM4\b', 'AM4'),
        (r'\bSocket\s*AM5\b', 'AM5'),
        (r'\bSocket\s*AM4\b', 'AM4'),
        (r'\bLGA[\s\-]?1851\b', 'LGA1851'),
        (r'\bLGA[\s\-]?1700\b', 'LGA1700'),
        (r'\bLGA[\s\-]?1200\b', 'LGA1200'),
        (r'\bLGA[\s\-]?1151\b', 'LGA1151'),
        (r'\bLGA[\s\-]?2066\b', 'LGA2066'),
        (r'\bsTR[X]?4\b', 'sTRX4'),
        (r'\bsWRX8\b', 'sWRX8'),
    ]
    
    # Form factor patterns
    FORM_FACTORS = {
        'E-ATX': [r'\bE[\s\-]?ATX\b', r'\bExtended\s*ATX\b', r'\bEATX\b'],
        'ATX': [r'\bATX\b'],  # Must check after E-ATX
        'Micro-ATX': [r'\bMicro[\s\-]?ATX\b', r'\bmATX\b', r'\bM[\s\-]?ATX\b'],
        'Mini-ITX': [r'\bMini[\s\-]?ITX\b', r'\bITX\b'],
        'Mini-DTX': [r'\bMini[\s\-]?DTX\b', r'\bDTX\b'],
    }
    
    # Spec keys
    SOCKET_SPEC_KEYS = [
        'socket', 'cpu_socket', 'processor_socket', 'socket_type',
        'supported_cpu', 'cpu_support', 'processor_support',
    ]
    
    CHIPSET_SPEC_KEYS = [
        'chipset', 'chipset_model', 'motherboard_chipset', 'platform',
    ]
    
    FORM_FACTOR_SPEC_KEYS = [
        'form_factor', 'form', 'size', 'motherboard_form_factor',
        'board_form_factor', 'format',
    ]
    
    MEMORY_TYPE_SPEC_KEYS = [
        'memory_type', 'ram_type', 'memory', 'ddr', 'memory_support',
        'supported_memory', 'ram_support',
    ]
    
    MEMORY_SLOTS_SPEC_KEYS = [
        'memory_slots', 'ram_slots', 'dimm_slots', 'dimm', 'slots',
        'memory_slot', 'no_of_dimm', 'number_of_dimm',
    ]
    
    MEMORY_SPEED_SPEC_KEYS = [
        'memory_speed', 'ram_speed', 'max_memory_speed', 'memory_frequency',
        'ddr_speed', 'max_ddr_speed', 'supported_memory_speed',
    ]
    
    MEMORY_CAPACITY_SPEC_KEYS = [
        'max_memory', 'maximum_memory', 'max_ram', 'memory_capacity',
        'max_memory_capacity', 'supported_memory_capacity',
    ]
    
    @property
    def component_type(self) -> str:
        return 'motherboard'
    
    def extract(
        self,
        title: str,
        specs: Dict[str, Any],
        brand: Optional[str] = None,
    ) -> ExtractionResult:
        """
        Extract motherboard compatibility attributes.
        
        Args:
            title: Motherboard product title
            specs: Raw specs dictionary
            brand: Pre-extracted brand (not used for motherboards)
            
        Returns:
            ExtractionResult with mobo_socket, mobo_chipset, memory_type, etc.
        """
        attributes = {'component_type': 'motherboard'}
        warnings = []
        confidence = 0.0
        source = 'none'
        
        # 1. Extract chipset (often easier to find than socket)
        chipset, chipset_src = self._extract_chipset(title, specs)
        if chipset:
            attributes['mobo_chipset'] = chipset
        
        # 2. Extract socket
        socket, socket_conf, socket_src = self._extract_socket(title, specs, chipset)
        if socket:
            attributes['mobo_socket'] = socket
            confidence = socket_conf
            source = socket_src
        else:
            warnings.append("Could not determine motherboard socket")
        
        # 3. Extract form factor
        form_factor = self._extract_form_factor(title, specs)
        if form_factor:
            attributes['mobo_form_factor'] = form_factor
        
        # 4. Extract memory type
        memory_type, mem_src = self._extract_memory_type(title, specs, chipset)
        if memory_type:
            attributes['memory_type'] = memory_type
        else:
            warnings.append("Could not determine memory type (DDR4/DDR5)")
        
        # 5. Extract memory slots
        mem_slots = self._extract_memory_slots(specs)
        if mem_slots:
            attributes['memory_slots'] = mem_slots
        
        # 6. Extract max memory speed
        max_speed = self._extract_memory_max_speed(specs, title)
        if max_speed:
            attributes['memory_max_speed_mhz'] = max_speed
        
        # 7. Extract max memory capacity
        max_capacity = self._extract_memory_max_capacity(specs)
        if max_capacity:
            attributes['memory_max_capacity_gb'] = max_capacity
        
        return ExtractionResult(
            attributes=attributes,
            confidence=confidence,
            source=source,
            warnings=warnings,
        )
    
    def _extract_chipset(
        self,
        title: str,
        specs: Dict[str, Any],
    ) -> Tuple[Optional[str], str]:
        """Extract chipset from title or specs."""
        # Build regex pattern from known chipsets
        chipset_pattern = r'\b(' + '|'.join(
            re.escape(c) for c in self.CHIPSET_TO_SOCKET.keys()
        ) + r')\b'
        
        # Try specs first
        chipset_val = self._find_spec_value(specs, self.CHIPSET_SPEC_KEYS)
        if chipset_val:
            match = re.search(chipset_pattern, chipset_val, re.IGNORECASE)
            if match:
                return (match.group(1).upper(), 'specs')
        
        # Try title
        match = re.search(chipset_pattern, title, re.IGNORECASE)
        if match:
            return (match.group(1).upper(), 'title')
        
        return (None, 'none')
    
    def _extract_socket(
        self,
        title: str,
        specs: Dict[str, Any],
        chipset: Optional[str],
    ) -> Tuple[Optional[str], float, str]:
        """Extract socket with confidence, using chipset for inference if needed."""
        # Try specs first (highest confidence)
        socket_val = self._find_spec_value(specs, self.SOCKET_SPEC_KEYS)
        
        if socket_val:
            for pattern, socket_name in self.SOCKET_PATTERNS:
                match = re.search(pattern, socket_val, re.IGNORECASE)
                if match:
                    return (socket_name, 0.95, 'specs')
        
        # Try title (high confidence)
        for pattern, socket_name in self.SOCKET_PATTERNS:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return (socket_name, 0.90, 'title')
        
        # Infer from chipset (medium confidence)
        if chipset and chipset.upper() in self.CHIPSET_TO_SOCKET:
            inferred_socket = self.CHIPSET_TO_SOCKET[chipset.upper()]
            return (inferred_socket, 0.80, 'inferred')
        
        return (None, 0.0, 'none')
    
    def _extract_form_factor(
        self,
        title: str,
        specs: Dict[str, Any],
    ) -> Optional[str]:
        """Extract motherboard form factor."""
        # Check specs first
        ff_val = self._find_spec_value(specs, self.FORM_FACTOR_SPEC_KEYS)
        text_to_check = f"{ff_val or ''} {title}"
        
        # Check in order (E-ATX before ATX to avoid false matches)
        for form_factor in ['E-ATX', 'Micro-ATX', 'Mini-ITX', 'Mini-DTX', 'ATX']:
            for pattern in self.FORM_FACTORS[form_factor]:
                if re.search(pattern, text_to_check, re.IGNORECASE):
                    return form_factor
        
        return None
    
    def _extract_memory_type(
        self,
        title: str,
        specs: Dict[str, Any],
        chipset: Optional[str],
    ) -> Tuple[Optional[str], str]:
        """Extract DDR type (DDR4 or DDR5)."""
        # Try specs (scan all relevant keys to avoid missing DDR when the first
        # matched key doesn't contain DDR info)
        mem_values = []
        for key, value in specs.items():
            normalized = self._normalize_key(key)
            if normalized in self.MEMORY_TYPE_SPEC_KEYS and value is not None:
                mem_values.append(str(value))

        for mem_val in mem_values:
            if re.search(r'\bDDR5\b', mem_val, re.IGNORECASE):
                return ('DDR5', 'specs')
            if re.search(r'\bDDR4\b', mem_val, re.IGNORECASE):
                return ('DDR4', 'specs')

        # If none of the matched keys include DDR, scan all spec values
        specs_text = ' '.join(str(v) for v in specs.values() if v)
        has_ddr5 = bool(re.search(r'\bDDR5\b', specs_text, re.IGNORECASE))
        has_ddr4 = bool(re.search(r'\bDDR4\b', specs_text, re.IGNORECASE))

        if has_ddr5 and not has_ddr4:
            return ('DDR5', 'specs')
        if has_ddr4 and not has_ddr5:
            return ('DDR4', 'specs')

        # Speed-based fallback inference (when DDR text is missing)
        # If max speed > 4000 => DDR5, if 2200 <= max speed < 4000 => DDR4,
        # if max speed < 2200 => DDR3
        speed_candidates = []
        speed_text = f"{title} {specs_text}"
        for match in re.finditer(r'(\d{4,5})\s*(?:MHz|MT/s)', speed_text, re.IGNORECASE):
            try:
                speed_candidates.append(int(match.group(1)))
            except ValueError:
                continue

        if speed_candidates:
            max_speed = max(speed_candidates)
            if max_speed > 4000:
                return ('DDR5', 'inferred_speed')
            if 2200 <= max_speed < 4000:
                return ('DDR4', 'inferred_speed')
            if max_speed < 2200:
                return ('DDR3', 'inferred_speed')
        
        # Try title
        if re.search(r'\bDDR5\b', title, re.IGNORECASE):
            return ('DDR5', 'title')
        if re.search(r'\bDDR4\b', title, re.IGNORECASE):
            return ('DDR4', 'title')
        
        # Infer from chipset (or use chipset to disambiguate mixed DDR mentions)
        if chipset and chipset.upper() in self.CHIPSET_TO_DDR:
            return (self.CHIPSET_TO_DDR[chipset.upper()], 'inferred')
        
        return (None, 'none')
    
    def _extract_memory_slots(self, specs: Dict[str, Any]) -> Optional[int]:
        """Extract number of DIMM slots."""
        slots_val = self._find_spec_value(specs, self.MEMORY_SLOTS_SPEC_KEYS)
        
        if slots_val:
            num = self._extract_number(slots_val)
            if num and 1 <= num <= 8:  # Reasonable slot count
                return num
        
        return None
    
    def _extract_memory_max_speed(
        self,
        specs: Dict[str, Any],
        title: str,
    ) -> Optional[int]:
        """Extract maximum supported memory speed in MHz."""
        speed_val = self._find_spec_value(specs, self.MEMORY_SPEED_SPEC_KEYS)
        
        if speed_val:
            # Match patterns like "6000MHz", "6000 MHz", "DDR5-6000"
            match = re.search(r'(\d{4,5})\s*(?:MHz|MT/s)?', speed_val, re.IGNORECASE)
            if match:
                speed = int(match.group(1))
                if 1600 <= speed <= 10000:  # Reasonable range
                    return speed
        
        # Try title for max speed
        match = re.search(r'(?:OC\s*)?(\d{4,5})\s*(?:MHz|MT/s)', title, re.IGNORECASE)
        if match:
            speed = int(match.group(1))
            if 1600 <= speed <= 10000:
                return speed
        
        return None
    
    def _extract_memory_max_capacity(self, specs: Dict[str, Any]) -> Optional[int]:
        """Extract maximum supported memory capacity in GB."""
        cap_val = self._find_spec_value(specs, self.MEMORY_CAPACITY_SPEC_KEYS)
        
        if cap_val:
            # Match patterns like "128GB", "128 GB", "Up to 128GB"
            match = re.search(r'(\d+)\s*GB', cap_val, re.IGNORECASE)
            if match:
                capacity = int(match.group(1))
                if 8 <= capacity <= 1024:  # Reasonable range
                    return capacity
        
        return None
