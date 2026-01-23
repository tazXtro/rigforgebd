"""
Normalizers for extracting canonical compatibility attributes.

This package provides component-specific normalizers that extract
structured compatibility data from raw scraped specs and titles.
"""

from .base import BaseNormalizer, ExtractionResult
from .cpu_normalizer import CPUNormalizer
from .motherboard_normalizer import MotherboardNormalizer
from .ram_normalizer import RAMNormalizer

__all__ = [
    'BaseNormalizer',
    'ExtractionResult',
    'CPUNormalizer',
    'MotherboardNormalizer',
    'RAMNormalizer',
]
