"""
Base normalizer class for compatibility attribute extraction.

Provides the abstract interface and common utilities for all
component-specific normalizers.
"""

import re
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, Iterable

logger = logging.getLogger(__name__)


@dataclass
class ExtractionResult:
    """
    Result of compatibility attribute extraction.
    
    Attributes:
        attributes: Dict of extracted canonical fields (e.g., cpu_socket, memory_type)
        confidence: Overall extraction confidence (0.00-1.00)
        source: Primary source of extraction ('specs', 'title', 'inferred')
        warnings: List of extraction issues or uncertainties
    """
    attributes: Dict[str, Any]
    confidence: float
    source: str
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database storage."""
        return {
            **self.attributes,
            'confidence': self.confidence,
            'extraction_source': self.source,
            'extraction_warnings': self.warnings if self.warnings else None,
        }


class BaseNormalizer(ABC):
    """
    Abstract base class for component-specific normalizers.
    
    Subclasses must implement:
        - component_type: Property returning 'cpu', 'motherboard', or 'ram'
        - extract(): Method to extract canonical attributes from raw data
    
    Example:
        >>> normalizer = CPUNormalizer()
        >>> result = normalizer.extract(
        ...     title="AMD Ryzen 7 5800X Processor",
        ...     specs={"Socket": "AM4", "TDP": "105W"},
        ... )
        >>> print(result.attributes)
        {'component_type': 'cpu', 'cpu_socket': 'AM4', 'cpu_brand': 'AMD'}
    """
    
    @property
    @abstractmethod
    def component_type(self) -> str:
        """
        Return the component type this normalizer handles.
        
        Returns:
            One of: 'cpu', 'motherboard', 'ram'
        """
        pass
    
    @abstractmethod
    def extract(
        self,
        title: str,
        specs: Dict[str, Any],
        brand: Optional[str] = None,
    ) -> ExtractionResult:
        """
        Extract canonical compatibility attributes from raw data.
        
        Args:
            title: Product title/name
            specs: Raw specs dict (from JSONB)
            brand: Pre-extracted brand if available
            
        Returns:
            ExtractionResult with attributes, confidence, and any warnings
        """
        pass
    
    def _normalize_key(self, key: str) -> str:
        """
        Normalize a spec key for consistent matching.
        
        Converts to lowercase, replaces spaces/hyphens with underscores.
        
        Args:
            key: Raw spec key
            
        Returns:
            Normalized key string
        """
        if not key:
            return ''
        return key.lower().strip().replace(' ', '_').replace('-', '_')
    
    def _find_spec_value(
        self,
        specs: Dict[str, Any],
        possible_keys: List[str],
    ) -> Optional[str]:
        """
        Find a spec value by trying multiple possible key variations.
        
        Args:
            specs: Raw specs dictionary
            possible_keys: List of normalized key names to try
            
        Returns:
            The spec value as string, or None if not found
        """
        values = self._find_spec_values(specs, possible_keys)
        if values:
            return values[0]
        return None

    def _find_spec_values(
        self,
        specs: Dict[str, Any],
        possible_keys: List[str],
    ) -> List[str]:
        """
        Find all spec values for multiple possible key variations.

        Args:
            specs: Raw specs dictionary
            possible_keys: List of normalized key names to try

        Returns:
            List of matching spec values as strings
        """
        values: List[str] = []
        for key in specs:
            normalized = self._normalize_key(key)
            if normalized in possible_keys:
                value = specs.get(key)
                if value is not None:
                    text = self._stringify_value(value)
                    if text:
                        values.append(text)
        return values
    
    def _extract_number(self, text: str) -> Optional[int]:
        """
        Extract the first integer from a text string.
        
        Args:
            text: Text potentially containing a number
            
        Returns:
            Integer value or None
        """
        if not text:
            return None
        match = re.search(r'(\d+)', text)
        if match:
            return int(match.group(1))
        return None
    
    def _extract_float(self, text: str) -> Optional[float]:
        """
        Extract the first float from a text string.
        
        Args:
            text: Text potentially containing a number
            
        Returns:
            Float value or None
        """
        if not text:
            return None
        match = re.search(r'(\d+\.?\d*)', text)
        if match:
            return float(match.group(1))
        return None
    
    def _combine_text_sources(
        self,
        title: str,
        specs: Dict[str, Any],
    ) -> str:
        """
        Combine title and all spec values into searchable text.
        
        Args:
            title: Product title
            specs: Specs dictionary
            
        Returns:
            Combined text string for pattern matching
        """
        spec_values = ' '.join(
            self._stringify_value(v) for v in specs.values() if v is not None
        )
        return f"{title} {spec_values}".strip()

    def _stringify_value(self, value: Any) -> str:
        """
        Convert spec values to a normalized string.

        Handles lists/tuples/sets by joining, and dicts by joining values.
        """
        if value is None:
            return ''
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, dict):
            parts = [self._stringify_value(v) for v in value.values() if v is not None]
            return ' '.join(p for p in parts if p)
        if isinstance(value, (list, tuple, set)):
            parts = [self._stringify_value(v) for v in value if v is not None]
            return ' '.join(p for p in parts if p)
        return str(value).strip()
