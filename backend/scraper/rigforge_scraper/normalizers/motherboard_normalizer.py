"""
Motherboard Normalizer for extracting compatibility attributes.

Extracts socket type, chipset, form factor, and memory support from
motherboard product data.
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple

from .base import BaseNormalizer, ExtractionResult
from .data_loader import load_normalizer_data

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
    
    DATA = load_normalizer_data("motherboard")
    CHIPSET_TO_SOCKET = DATA.get("chipset_to_socket", {})
    CHIPSET_TO_DDR = DATA.get("chipset_to_ddr", {})
    SOCKET_PATTERNS = [
        (item["pattern"], item.get("socket"))
        for item in DATA.get("socket_patterns", [])
    ]
    FORM_FACTORS = DATA.get("form_factors", {})
    SOCKET_SPEC_KEYS = DATA.get("socket_spec_keys", [])
    CHIPSET_SPEC_KEYS = DATA.get("chipset_spec_keys", [])
    FORM_FACTOR_SPEC_KEYS = DATA.get("form_factor_spec_keys", [])
    MEMORY_TYPE_SPEC_KEYS = DATA.get("memory_type_spec_keys", [])
    MEMORY_SLOTS_SPEC_KEYS = DATA.get("memory_slots_spec_keys", [])
    MEMORY_SPEED_SPEC_KEYS = DATA.get("memory_speed_spec_keys", [])
    MEMORY_CAPACITY_SPEC_KEYS = DATA.get("memory_capacity_spec_keys", [])
    
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
        
        # 8. Extract canonical motherboard name for dataset matching
        canonical_name = self._normalize_mobo_name(title, brand, chipset)
        if canonical_name:
            attributes['canonical_mobo_name'] = canonical_name
        
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
        mem_values = self._find_spec_values(specs, self.MEMORY_TYPE_SPEC_KEYS)

        for mem_val in mem_values:
            if re.search(r'\bDDR5\b', mem_val, re.IGNORECASE):
                return ('DDR5', 'specs')
            if re.search(r'\bDDR4\b', mem_val, re.IGNORECASE):
                return ('DDR4', 'specs')

        # If none of the matched keys include DDR, scan all spec values
        specs_text = ' '.join(self._stringify_value(v) for v in specs.values() if v is not None)
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
    
    def _normalize_mobo_name(
        self,
        title: str,
        brand: Optional[str],
        chipset: Optional[str],
    ) -> Optional[str]:
        """
        Extract normalized/canonical motherboard name for dataset matching.
        
        Format: "Brand Chipset Model [Features]"
        Examples:
            - "MSI B550M PRO-VDH WIFI DDR4 Motherboard" -> "MSI B550M PRO-VDH WIFI"
            - "ASUS ROG STRIX B650E-E GAMING WIFI" -> "ASUS B650E-E ROG STRIX"
            - "Gigabyte Z790 AORUS Elite AX DDR5" -> "Gigabyte Z790 AORUS Elite AX"
        
        Args:
            title: Motherboard product title
            brand: Pre-extracted brand if available
            chipset: Pre-extracted chipset if available
            
        Returns:
            Normalized motherboard name or None if pattern not matched
        """
        if not title:
            return None
        
        # Known motherboard brands
        BRANDS = [
            'ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Biostar', 'EVGA', 
            'NZXT', 'Colorful', 'Maxsun', 'GALAX'
        ]
        
        # Extract brand from title if not provided
        extracted_brand = brand
        if not extracted_brand:
            for b in BRANDS:
                if re.search(rf'\b{re.escape(b)}\b', title, re.IGNORECASE):
                    extracted_brand = b
                    break
        
        if not extracted_brand:
            return None
        
        # Normalize brand casing
        brand_normalized = extracted_brand.upper() if extracted_brand.upper() == 'ASUS' else extracted_brand.title()
        if brand_normalized.upper() == 'ASROCK':
            brand_normalized = 'ASRock'
        
        # Build chipset pattern from known chipsets
        all_chipsets = list(self.CHIPSET_TO_SOCKET.keys())
        chipset_pattern = r'\b(' + '|'.join(re.escape(c) for c in all_chipsets) + r')[ME]?\b'
        
        # Extract chipset from title if not provided
        extracted_chipset = chipset
        if not extracted_chipset:
            match = re.search(chipset_pattern, title, re.IGNORECASE)
            if match:
                extracted_chipset = match.group(0).upper()
        
        if not extracted_chipset:
            return None
        
        # Extract model name - look for text after chipset
        # Common patterns: PRO-VDH, AORUS Elite, ROG STRIX, TUF Gaming
        model_parts = []
        
        # Important product line identifiers to preserve
        PRODUCT_LINES = [
            'ROG STRIX', 'ROG CROSSHAIR', 'TUF GAMING', 'PRIME', 'ProArt',
            'MAG', 'MEG', 'MPG', 'PRO', 'AORUS', 'MASTER', 'ELITE', 'ULTRA',
            'GAMING', 'GAMING PLUS', 'CARBON', 'ACE', 'FORMULA', 'EXTREME',
            'PHANTOM', 'TAICHI', 'STEEL LEGEND', 'PG', 'CREATOR'
        ]
        
        # Important features to preserve
        FEATURES = ['WIFI', 'WI-FI', 'AX', 'WIFI6', 'WIFI 6', 'WIFI6E', 'WIFI 6E']
        
        # Words to strip from model extraction
        STRIP_WORDS = [
            'Motherboard', 'Gaming Motherboard', 'Mainboard', 'LGA1700',
            'LGA1200', 'LGA1151', 'AM4', 'AM5', 'Socket', 'DDR4', 'DDR5',
            'ATX', 'Micro-ATX', 'Mini-ITX', 'mATX', 'E-ATX', 'EATX',
            'Gen5', 'Gen4', 'Gen3', 'PCIe', 'USB 3', 'RGB', 'ARGB'
        ]
        
        # Extract product line
        for pl in PRODUCT_LINES:
            if re.search(rf'\b{re.escape(pl)}\b', title, re.IGNORECASE):
                model_parts.append(pl.upper())
                break
        
        # Try to extract the model number/name after chipset
        chipset_idx = title.upper().find(extracted_chipset.upper())
        if chipset_idx >= 0:
            after_chipset = title[chipset_idx + len(extracted_chipset):].strip()
            
            # Clean and extract meaningful model parts
            for word in STRIP_WORDS:
                after_chipset = re.sub(
                    rf'\b{re.escape(word)}\b',
                    '',
                    after_chipset,
                    flags=re.IGNORECASE
                )
            
            # Extract first meaningful model segment
            model_match = re.match(
                r'^[\s\-]*([A-Za-z0-9][A-Za-z0-9\-]{1,20}(?:\s+[A-Za-z0-9\-]{2,15}){0,2})',
                after_chipset.strip()
            )
            if model_match:
                model_name = model_match.group(1).strip()
                if model_name and model_name.upper() not in [p.upper() for p in model_parts]:
                    model_parts.append(model_name.upper())
        
        # Check for WiFi feature
        for feat in FEATURES:
            if re.search(rf'\b{re.escape(feat)}\b', title, re.IGNORECASE):
                feat_normalized = feat.upper().replace('-', '').replace(' ', '')
                if feat_normalized not in [p.upper() for p in model_parts]:
                    model_parts.append(feat_normalized)
                break
        
        # Construct canonical name
        model_str = ' '.join(model_parts) if model_parts else ''
        canonical = f"{brand_normalized} {extracted_chipset}"
        if model_str:
            canonical = f"{canonical} {model_str}"
        
        return canonical.strip()

