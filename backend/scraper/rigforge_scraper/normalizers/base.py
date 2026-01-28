"""
Base normalizer class for compatibility attribute extraction.

Provides the abstract interface and common utilities for all
component-specific normalizers.
"""

import re
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import (
    Any,
    Dict,
    FrozenSet,
    Iterable,
    List,
    Optional,
    Pattern,
    Tuple,
    Union,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class ExtractionResult:
    """
    Immutable result of compatibility attribute extraction.
    
    Attributes:
        attributes: Dict of extracted canonical fields (e.g., cpu_socket, memory_type)
        confidence: Overall extraction confidence (0.00-1.00)
        source: Primary source of extraction ('specs', 'title', 'inferred')
        warnings: Tuple of extraction issues or uncertainties (immutable)
    
    Example:
        >>> result = ExtractionResult(
        ...     attributes={'cpu_socket': 'AM5', 'cpu_brand': 'AMD'},
        ...     confidence=0.95,
        ...     source='specs',
        ...     warnings=('Could not determine TDP',),
        ... )
        >>> db_data = result.to_dict()
    """
    attributes: Dict[str, Any]
    confidence: float
    source: str
    warnings: Tuple[str, ...] = field(default_factory=tuple)
    
    def __post_init__(self):
        """Validate confidence is in valid range."""
        if not 0.0 <= self.confidence <= 1.0:
            # Use object.__setattr__ since dataclass is frozen
            object.__setattr__(
                self, 'confidence', 
                max(0.0, min(1.0, self.confidence))
            )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary for database storage.
        
        Returns:
            Dict containing all attributes plus extraction metadata.
        """
        return {
            **self.attributes,
            'confidence': round(self.confidence, 2),
            'extraction_source': self.source,
            'extraction_warnings': list(self.warnings) if self.warnings else None,
        }
    
    def with_warning(self, warning: str) -> 'ExtractionResult':
        """
        Create a new ExtractionResult with an additional warning.
        
        Args:
            warning: Warning message to add
            
        Returns:
            New ExtractionResult with the warning appended
        """
        return ExtractionResult(
            attributes=self.attributes,
            confidence=self.confidence,
            source=self.source,
            warnings=self.warnings + (warning,),
        )


# Type aliases for clarity
SpecsDict = Dict[str, Any]
PatternSocketPair = Tuple[Pattern[str], str]


class BaseNormalizer(ABC):
    """
    Abstract base class for component-specific normalizers.
    
    Subclasses must implement:
        - component_type: Property returning 'cpu', 'motherboard', or 'ram'
        - extract(): Method to extract canonical attributes from raw data
    
    Provides common utilities for:
        - Spec key normalization and lookup
        - Text extraction and parsing
        - Confidence calculation
    
    Example:
        >>> normalizer = CPUNormalizer()
        >>> result = normalizer.extract(
        ...     title="AMD Ryzen 7 5800X Processor",
        ...     specs={"Socket": "AM4", "TDP": "105W"},
        ... )
        >>> print(result.attributes)
        {'component_type': 'cpu', 'cpu_socket': 'AM4', 'cpu_brand': 'AMD'}
    """
    
    # Subclasses should override if they need debug logging
    _debug_logging: bool = False
    
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
        specs: SpecsDict,
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
        
        Converts to lowercase, replaces spaces/hyphens with underscores,
        removes special characters.
        
        Args:
            key: Raw spec key
            
        Returns:
            Normalized key string
            
        Example:
            >>> self._normalize_key("Socket Type")
            'socket_type'
            >>> self._normalize_key("CPU-Socket")
            'cpu_socket'
        """
        if not key:
            return ''
        normalized = key.lower().strip()
        normalized = re.sub(r'[\s\-]+', '_', normalized)
        normalized = re.sub(r'[^\w_]', '', normalized)
        return normalized
    
    def _find_spec_value(
        self,
        specs: SpecsDict,
        possible_keys: Union[FrozenSet[str], List[str], Tuple[str, ...]],
    ) -> Optional[str]:
        """
        Find a spec value by trying multiple possible key variations.
        
        Args:
            specs: Raw specs dictionary
            possible_keys: Set/list of normalized key names to try
            
        Returns:
            The first matching spec value as string, or None if not found
        """
        values = self._find_spec_values(specs, possible_keys)
        return values[0] if values else None

    def _find_spec_values(
        self,
        specs: SpecsDict,
        possible_keys: Union[FrozenSet[str], List[str], Tuple[str, ...]],
    ) -> List[str]:
        """
        Find all spec values for multiple possible key variations.

        Args:
            specs: Raw specs dictionary
            possible_keys: Set/list of normalized key names to try

        Returns:
            List of matching spec values as strings (non-empty only)
        """
        # Convert to set for O(1) lookup if not already
        key_set = possible_keys if isinstance(possible_keys, frozenset) else set(possible_keys)
        
        values: List[str] = []
        for raw_key, raw_value in specs.items():
            normalized_key = self._normalize_key(raw_key)
            if normalized_key in key_set:
                text = self._stringify_value(raw_value)
                if text:
                    values.append(text)
                    if self._debug_logging:
                        logger.debug(f"Found spec '{raw_key}' -> '{text}'")
        
        return values
    
    def _extract_number(self, text: str) -> Optional[int]:
        """
        Extract the first integer from a text string.
        
        Args:
            text: Text potentially containing a number
            
        Returns:
            Integer value or None
            
        Example:
            >>> self._extract_number("105W TDP")
            105
            >>> self._extract_number("Up to 128GB")
            128
        """
        if not text:
            return None
        match = re.search(r'(\d+)', text)
        return int(match.group(1)) if match else None
    
    def _extract_float(self, text: str) -> Optional[float]:
        """
        Extract the first float from a text string.
        
        Args:
            text: Text potentially containing a number
            
        Returns:
            Float value or None
            
        Example:
            >>> self._extract_float("3.5 GHz")
            3.5
        """
        if not text:
            return None
        match = re.search(r'(\d+\.?\d*)', text)
        return float(match.group(1)) if match else None
    
    def _combine_text_sources(
        self,
        title: str,
        specs: SpecsDict,
    ) -> str:
        """
        Combine title and all spec values into searchable text.
        
        Useful for broad pattern matching when specific key isn't known.
        
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

        Handles various types: str, int, float, list, dict, None.
        Recursively processes nested structures.

        Args:
            value: Any spec value
            
        Returns:
            Normalized string representation
        """
        if value is None:
            return ''
        
        if isinstance(value, str):
            return value.strip()
        
        if isinstance(value, (int, float)):
            return str(value)
        
        if isinstance(value, dict):
            parts = [self._stringify_value(v) for v in value.values() if v is not None]
            return ' '.join(p for p in parts if p)
        
        if isinstance(value, (list, tuple, set)):
            parts = [self._stringify_value(v) for v in value if v is not None]
            return ' '.join(p for p in parts if p)
        
        # Fallback for any other type
        return str(value).strip()
    
    def _match_pattern_list(
        self,
        text: str,
        patterns: Iterable[PatternSocketPair],
    ) -> Optional[Tuple[str, str]]:
        """
        Try to match text against a list of (pattern, value) pairs.
        
        Args:
            text: Text to search
            patterns: Iterable of (compiled_pattern, canonical_value) pairs
            
        Returns:
            Tuple of (matched_text, canonical_value) or None
        """
        for pattern, canonical_value in patterns:
            match = pattern.search(text)
            if match:
                return (match.group(0), canonical_value)
        return None
    
    def _log_extraction(
        self,
        field: str,
        value: Any,
        source: str,
        confidence: float,
    ) -> None:
        """
        Log an extraction for debugging purposes.
        
        Only logs if _debug_logging is True.
        
        Args:
            field: Field name extracted
            value: Extracted value
            source: Source of extraction ('specs', 'title', 'inferred')
            confidence: Confidence level
        """
        if self._debug_logging:
            logger.debug(
                f"[{self.component_type}] Extracted {field}='{value}' "
                f"from {source} (confidence={confidence:.2f})"
            )
