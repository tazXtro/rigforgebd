"""
Motherboard Normalizer for extracting compatibility attributes.

Extracts socket type, chipset, form factor, and memory support from
motherboard product data. Properly handles dual-DDR chipsets.
"""

import re
import logging
from typing import Any, Dict, List, Optional, Tuple

from .base import BaseNormalizer, ExtractionResult, SpecsDict
from .patterns.motherboard_patterns import (
    # Mappings
    CHIPSET_TO_SOCKET,
    CHIPSET_TO_DDR,
    CHIPSET_PATTERN,
    # Socket patterns
    SOCKET_PATTERNS,
    # Form factor patterns
    FORM_FACTOR_PATTERNS,
    # DDR patterns
    DDR5_PATTERN,
    DDR4_PATTERN,
    DDR3_PATTERN,
    SPEED_PATTERN,
    DDR5_MIN_SPEED,
    DDR4_MAX_SPEED,
    # Spec keys
    SOCKET_SPEC_KEYS,
    CHIPSET_SPEC_KEYS,
    FORM_FACTOR_SPEC_KEYS,
    MEMORY_TYPE_SPEC_KEYS,
    MEMORY_SLOTS_SPEC_KEYS,
    MEMORY_SPEED_SPEC_KEYS,
    MEMORY_CAPACITY_SPEC_KEYS,
    # Branding
    MOTHERBOARD_BRANDS,
    PRODUCT_LINES,
    WIFI_FEATURES,
    STRIP_WORDS,
    # Validation
    MIN_MEMORY_SLOTS,
    MAX_MEMORY_SLOTS,
    MIN_MEMORY_SPEED_MHZ,
    MAX_MEMORY_SPEED_MHZ,
    MIN_MEMORY_CAPACITY_GB,
    MAX_MEMORY_CAPACITY_GB,
)

logger = logging.getLogger(__name__)


class MotherboardNormalizer(BaseNormalizer):
    """
    Normalizer for extracting motherboard compatibility attributes.
    
    Extracts:
        - mobo_socket: AM4, AM5, LGA1700, etc.
        - mobo_chipset: B550, X670, Z790, etc.
        - mobo_form_factor: ATX, Micro-ATX, Mini-ITX, etc.
        - memory_type: DDR4, DDR5 (with dual-DDR support)
        - memory_slots: Number of DIMM slots
        - memory_max_speed_mhz: Maximum supported memory speed
        - memory_max_capacity_gb: Maximum supported memory capacity
        - canonical_mobo_name: Normalized name for dataset matching
    
    Example:
        >>> normalizer = MotherboardNormalizer()
        >>> result = normalizer.extract(
        ...     title="ASUS ROG STRIX B550-F GAMING WIFI",
        ...     specs={"Chipset": "AMD B550", "Form Factor": "ATX"},
        ... )
        >>> print(result.attributes['mobo_socket'])
        'AM4'
    """
    
    @property
    def component_type(self) -> str:
        return 'motherboard'
    
    def extract(
        self,
        title: str,
        specs: SpecsDict,
        brand: Optional[str] = None,
    ) -> ExtractionResult:
        """
        Extract motherboard compatibility attributes.
        
        Args:
            title: Motherboard product title
            specs: Raw specs dictionary
            brand: Pre-extracted brand (used for canonical name)
            
        Returns:
            ExtractionResult with mobo_socket, mobo_chipset, memory_type, etc.
        """
        attributes: Dict[str, Any] = {'component_type': 'motherboard'}
        warnings: List[str] = []
        confidence = 0.0
        source = 'none'
        
        # 1. Extract chipset (often easier to find than socket)
        chipset, chipset_src = self._extract_chipset(title, specs)
        if chipset:
            attributes['mobo_chipset'] = chipset
            self._log_extraction('mobo_chipset', chipset, chipset_src, 0.90)
        
        # 2. Extract socket
        socket, socket_conf, socket_src = self._extract_socket(title, specs, chipset)
        if socket:
            attributes['mobo_socket'] = socket
            confidence = socket_conf
            source = socket_src
            self._log_extraction('mobo_socket', socket, socket_src, socket_conf)
        else:
            warnings.append("Could not determine motherboard socket")
        
        # 3. Extract form factor
        form_factor = self._extract_form_factor(title, specs)
        if form_factor:
            attributes['mobo_form_factor'] = form_factor
            self._log_extraction('mobo_form_factor', form_factor, 'detected', 0.90)
        
        # 4. Extract memory type (with dual-DDR awareness)
        memory_type, mem_src = self._extract_memory_type(title, specs, chipset)
        if memory_type:
            attributes['memory_type'] = memory_type
            self._log_extraction('memory_type', memory_type, mem_src, 0.85)
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
            warnings=tuple(warnings),
        )
    
    def _extract_chipset(
        self,
        title: str,
        specs: SpecsDict,
    ) -> Tuple[Optional[str], str]:
        """
        Extract chipset from title or specs.
        
        Returns:
            Tuple of (chipset, source)
        """
        # Try specs first
        chipset_val = self._find_spec_value(specs, CHIPSET_SPEC_KEYS)
        if chipset_val:
            match = CHIPSET_PATTERN.search(chipset_val)
            if match:
                return (match.group(1).upper(), 'specs')
        
        # Try title
        match = CHIPSET_PATTERN.search(title)
        if match:
            return (match.group(1).upper(), 'title')
        
        return (None, 'none')
    
    def _extract_socket(
        self,
        title: str,
        specs: SpecsDict,
        chipset: Optional[str],
    ) -> Tuple[Optional[str], float, str]:
        """
        Extract socket with confidence, using chipset for inference if needed.
        
        Priority:
            1. Explicit socket in specs (0.95 confidence)
            2. Socket in title (0.90 confidence)
            3. Inferred from chipset (0.80 confidence)
        
        Returns:
            Tuple of (socket, confidence, source)
        """
        # Try specs first (highest confidence)
        socket_val = self._find_spec_value(specs, SOCKET_SPEC_KEYS)
        if socket_val:
            for pattern, socket_name in SOCKET_PATTERNS:
                if pattern.search(socket_val):
                    return (socket_name, 0.95, 'specs')
        
        # Try title (high confidence)
        for pattern, socket_name in SOCKET_PATTERNS:
            if pattern.search(title):
                return (socket_name, 0.90, 'title')
        
        # Infer from chipset (medium confidence)
        if chipset:
            chipset_upper = chipset.upper()
            # Handle chipsets with E suffix (B650E -> B650E or B650)
            if chipset_upper in CHIPSET_TO_SOCKET:
                return (CHIPSET_TO_SOCKET[chipset_upper], 0.80, 'inferred')
            # Try without E suffix
            base_chipset = chipset_upper.rstrip('EM')
            if base_chipset in CHIPSET_TO_SOCKET:
                return (CHIPSET_TO_SOCKET[base_chipset], 0.75, 'inferred')
        
        return (None, 0.0, 'none')
    
    def _extract_form_factor(
        self,
        title: str,
        specs: SpecsDict,
    ) -> Optional[str]:
        """
        Extract motherboard form factor.
        
        Checks in order of specificity to avoid false matches
        (e.g., "E-ATX" before "ATX").
        
        Returns:
            Form factor string or None
        """
        # Check specs first
        ff_val = self._find_spec_value(specs, FORM_FACTOR_SPEC_KEYS)
        text_to_check = f"{ff_val or ''} {title}"
        
        # Check patterns in order (most specific first)
        for form_factor, pattern in FORM_FACTOR_PATTERNS:
            if pattern.search(text_to_check):
                return form_factor
        
        return None
    
    def _extract_memory_type(
        self,
        title: str,
        specs: SpecsDict,
        chipset: Optional[str],
    ) -> Tuple[Optional[str], str]:
        """
        Extract DDR type (DDR4 or DDR5) with dual-DDR chipset awareness.
        
        For dual-DDR chipsets (Z690, B650, etc.), tries to determine
        the specific variant from title/specs. Falls back to DDR5
        for newer chipsets if ambiguous.
        
        Returns:
            Tuple of (memory_type, source)
        """
        # Collect all text to search
        mem_values = self._find_spec_values(specs, MEMORY_TYPE_SPEC_KEYS)
        specs_text = ' '.join(mem_values) if mem_values else ''
        
        # Also search all spec values for DDR mentions
        all_specs_text = ' '.join(
            self._stringify_value(v) for v in specs.values() if v is not None
        )
        
        # Check for explicit DDR type in specs
        has_ddr5_specs = bool(DDR5_PATTERN.search(specs_text) or DDR5_PATTERN.search(all_specs_text))
        has_ddr4_specs = bool(DDR4_PATTERN.search(specs_text) or DDR4_PATTERN.search(all_specs_text))
        
        # Unambiguous from specs
        if has_ddr5_specs and not has_ddr4_specs:
            return ('DDR5', 'specs')
        if has_ddr4_specs and not has_ddr5_specs:
            return ('DDR4', 'specs')
        
        # Check title
        has_ddr5_title = bool(DDR5_PATTERN.search(title))
        has_ddr4_title = bool(DDR4_PATTERN.search(title))
        
        if has_ddr5_title and not has_ddr4_title:
            return ('DDR5', 'title')
        if has_ddr4_title and not has_ddr5_title:
            return ('DDR4', 'title')
        
        # Speed-based inference
        combined_text = f"{title} {all_specs_text}"
        speed_matches = SPEED_PATTERN.findall(combined_text)
        if speed_matches:
            max_speed = max(int(s) for s in speed_matches)
            if max_speed >= DDR5_MIN_SPEED:
                return ('DDR5', 'inferred_speed')
            if max_speed < DDR4_MAX_SPEED:
                return ('DDR4', 'inferred_speed')
        
        # Infer from chipset
        if chipset:
            chipset_upper = chipset.upper()
            ddr_list = CHIPSET_TO_DDR.get(chipset_upper)
            
            if ddr_list:
                if len(ddr_list) == 1:
                    # Single DDR type supported
                    return (ddr_list[0], 'inferred')
                else:
                    # Dual-DDR chipset - default to DDR5 for newer platforms
                    # This is a reasonable default as DDR5 variants are more common
                    return ('DDR5', 'inferred_dual')
        
        return (None, 'none')
    
    def _extract_memory_slots(self, specs: SpecsDict) -> Optional[int]:
        """
        Extract number of DIMM slots.
        
        Returns:
            Number of slots (1-8) or None
        """
        slots_val = self._find_spec_value(specs, MEMORY_SLOTS_SPEC_KEYS)
        
        if slots_val:
            num = self._extract_number(slots_val)
            if num and MIN_MEMORY_SLOTS <= num <= MAX_MEMORY_SLOTS:
                return num
        
        return None
    
    def _extract_memory_max_speed(
        self,
        specs: SpecsDict,
        title: str,
    ) -> Optional[int]:
        """
        Extract maximum supported memory speed in MHz.
        
        Returns:
            Speed in MHz (1600-10000) or None
        """
        speed_val = self._find_spec_value(specs, MEMORY_SPEED_SPEC_KEYS)
        
        if speed_val:
            match = SPEED_PATTERN.search(speed_val)
            if match:
                speed = int(match.group(1))
                if MIN_MEMORY_SPEED_MHZ <= speed <= MAX_MEMORY_SPEED_MHZ:
                    return speed
        
        # Try title for max speed (often includes OC speeds)
        match = SPEED_PATTERN.search(title)
        if match:
            speed = int(match.group(1))
            if MIN_MEMORY_SPEED_MHZ <= speed <= MAX_MEMORY_SPEED_MHZ:
                return speed
        
        return None
    
    def _extract_memory_max_capacity(self, specs: SpecsDict) -> Optional[int]:
        """
        Extract maximum supported memory capacity in GB.
        
        Returns:
            Capacity in GB (8-1024) or None
        """
        cap_val = self._find_spec_value(specs, MEMORY_CAPACITY_SPEC_KEYS)
        
        if cap_val:
            # Match patterns like "128GB", "128 GB", "Up to 128GB"
            match = re.search(r'(\d+)\s*GB', cap_val, re.I)
            if match:
                capacity = int(match.group(1))
                if MIN_MEMORY_CAPACITY_GB <= capacity <= MAX_MEMORY_CAPACITY_GB:
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
            - "ASUS ROG STRIX B650E-E GAMING WIFI" -> "ASUS B650E ROG STRIX"
            - "Gigabyte Z790 AORUS Elite AX DDR5" -> "Gigabyte Z790 AORUS Elite AX"
        
        Args:
            title: Motherboard product title
            brand: Pre-extracted brand if available
            chipset: Pre-extracted chipset if available
            
        Returns:
            Normalized motherboard name or None
        """
        if not title:
            return None
        
        # Extract brand from title if not provided
        extracted_brand = brand
        if not extracted_brand:
            for b in MOTHERBOARD_BRANDS:
                if re.search(rf'\b{re.escape(b)}\b', title, re.I):
                    extracted_brand = b
                    break
        
        if not extracted_brand:
            return None
        
        # Normalize brand casing
        brand_normalized = extracted_brand.upper() if extracted_brand.upper() in ('ASUS', 'MSI', 'EVGA', 'NZXT') else extracted_brand.title()
        if brand_normalized.upper() == 'ASROCK':
            brand_normalized = 'ASRock'
        
        # Extract chipset from title if not provided
        extracted_chipset = chipset
        if not extracted_chipset:
            match = CHIPSET_PATTERN.search(title)
            if match:
                extracted_chipset = match.group(0).upper()
        
        if not extracted_chipset:
            return None
        
        # Extract model name components
        model_parts: List[str] = []
        
        # Check for product line identifiers
        for pl in PRODUCT_LINES:
            if re.search(rf'\b{re.escape(pl)}\b', title, re.I):
                model_parts.append(pl.upper())
                break
        
        # Try to extract model segment after chipset
        chipset_idx = title.upper().find(extracted_chipset.upper())
        if chipset_idx >= 0:
            after_chipset = title[chipset_idx + len(extracted_chipset):].strip()
            
            # Strip known marketing/technical words
            cleaned = after_chipset
            for word in STRIP_WORDS:
                cleaned = re.sub(rf'\b{re.escape(word)}\b', '', cleaned, flags=re.I)
            
            # Extract first meaningful model segment
            model_match = re.match(
                r'^[\s\-]*([A-Za-z0-9][A-Za-z0-9\-]{1,20}(?:\s+[A-Za-z0-9\-]{2,15}){0,2})',
                cleaned.strip()
            )
            if model_match:
                model_name = model_match.group(1).strip().upper()
                if model_name and model_name not in [p.upper() for p in model_parts]:
                    model_parts.append(model_name)
        
        # Check for WiFi feature
        for feat in WIFI_FEATURES:
            if re.search(rf'\b{re.escape(feat)}\b', title, re.I):
                feat_normalized = 'WIFI'
                if feat_normalized not in model_parts:
                    model_parts.append(feat_normalized)
                break
        
        # Construct canonical name
        model_str = ' '.join(model_parts) if model_parts else ''
        canonical = f"{brand_normalized} {extracted_chipset}"
        if model_str:
            canonical = f"{canonical} {model_str}"
        
        return canonical.strip()
    
    def normalize_name(
        self,
        title: str,
        brand: Optional[str] = None,
        chipset: Optional[str] = None,
    ) -> Optional[str]:
        """
        Public method to normalize a motherboard name for dataset matching.
        
        This is the public interface for name normalization, suitable for
        use by external code like management commands.
        
        Args:
            title: Motherboard product title or name
            brand: Optional pre-extracted brand
            chipset: Optional pre-extracted chipset
            
        Returns:
            Normalized motherboard name or None if pattern not matched
            
        Example:
            >>> normalizer = MotherboardNormalizer()
            >>> normalizer.normalize_name('ASUS ROG STRIX B550-F GAMING WIFI')
            'ASUS B550 ROG STRIX WIFI'
        """
        return self._normalize_mobo_name(title, brand, chipset)
