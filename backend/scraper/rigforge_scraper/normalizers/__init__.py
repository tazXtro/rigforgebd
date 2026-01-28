"""
Normalizers for extracting canonical compatibility attributes.

This package provides component-specific normalizers that extract
structured compatibility data from raw scraped specs and titles.

Architecture:
    - base.py: Abstract base class with common utilities
    - patterns/: Pre-compiled regex patterns and mappings (Python modules)
    - *_normalizer.py: Component-specific extraction logic

Usage:
    >>> from rigforge_scraper.normalizers import CPUNormalizer
    >>> normalizer = CPUNormalizer()
    >>> result = normalizer.extract(
    ...     title="AMD Ryzen 7 5800X Processor",
    ...     specs={"Socket": "AM4", "TDP": "105W"},
    ... )
    >>> print(result.attributes)
    {'component_type': 'cpu', 'cpu_socket': 'AM4', 'cpu_brand': 'AMD', ...}
    >>> print(result.confidence)
    0.95
"""

from .base import BaseNormalizer, ExtractionResult
from .cpu_normalizer import CPUNormalizer
from .motherboard_normalizer import MotherboardNormalizer
from .ram_normalizer import RAMNormalizer

__all__ = [
    # Base classes
    'BaseNormalizer',
    'ExtractionResult',
    # Normalizers
    'CPUNormalizer',
    'MotherboardNormalizer',
    'RAMNormalizer',
]


def get_normalizer(component_type: str) -> BaseNormalizer:
    """
    Factory function to get the appropriate normalizer for a component type.
    
    Args:
        component_type: One of 'cpu', 'motherboard', 'ram'
        
    Returns:
        Appropriate normalizer instance
        
    Raises:
        ValueError: If component_type is not recognized
        
    Example:
        >>> normalizer = get_normalizer('cpu')
        >>> isinstance(normalizer, CPUNormalizer)
        True
    """
    normalizers = {
        'cpu': CPUNormalizer,
        'motherboard': MotherboardNormalizer,
        'ram': RAMNormalizer,
    }
    
    if component_type not in normalizers:
        valid_types = ', '.join(sorted(normalizers.keys()))
        raise ValueError(
            f"Unknown component type: '{component_type}'. "
            f"Valid types: {valid_types}"
        )
    
    return normalizers[component_type]()
