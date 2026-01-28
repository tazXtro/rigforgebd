"""
Compatibility Service for context-aware component filtering.

Provides business logic for querying compatible components based on
user selections (e.g., compatible motherboards for a selected CPU).
"""

import logging
from typing import Dict, Any, List, Optional

from products.repositories import compat_repository, product_repository

logger = logging.getLogger(__name__)


class CompatibilityService:
    """
    Service for component compatibility queries.
    
    Implements the context-aware filtering logic:
    - CPU → compatible Motherboards (by socket)
    - Motherboard → compatible RAM (by DDR type)
    """
    
    def __init__(
        self,
        compat_repo=None,
        product_repo=None,
    ):
        self.compat_repo = compat_repo or compat_repository
        self.product_repo = product_repo or product_repository
    
    def get_compatible_motherboards(
        self,
        cpu_id: str,
        mode: str = 'strict',
    ) -> Dict[str, Any]:
        """
        Get motherboards compatible with the given CPU.
        
        Args:
            cpu_id: Product ID of the selected CPU
            mode: 'strict' (confident matches only) or 
                  'lenient' (includes unknown)
        
        Returns:
            {
                "cpu": {"id": ..., "socket": "AM4"},
                "mode": "strict"|"lenient",
                "compatible": [...product_ids...],
                "unknown": [...product_ids...],
                "error": optional error message
            }
        """
        # Get CPU's compatibility record
        cpu_compat = self.compat_repo.get_by_product_id(cpu_id)
        
        if not cpu_compat:
            return {
                "error": "CPU not found in compatibility database",
                "cpu": {"id": cpu_id, "socket": None},
                "mode": mode,
                "compatible": [],
                "unknown": [],
            }
        
        cpu_socket = cpu_compat.get('cpu_socket')
        
        if not cpu_socket:
            # Fallback: When CPU socket is unknown, return ALL motherboards
            # This provides a better UX than showing "no motherboards found"
            # for CPUs where socket data couldn't be extracted from retailer sites
            all_motherboards = self.compat_repo.find_all_motherboards()
            
            return {
                "warning": "CPU socket information not available - showing all motherboards",
                "cpu": {
                    "id": cpu_id,
                    "socket": None,
                    "confidence": cpu_compat.get('confidence', 0),
                },
                "mode": mode,
                "compatible": all_motherboards,
                "unknown": [],
            }
        
        # Query compatible motherboards
        compatible = self.compat_repo.find_motherboards_by_socket(
            socket=cpu_socket,
            min_confidence=0.70,
        )
        
        if mode == 'strict':
            return {
                "cpu": {
                    "id": cpu_id,
                    "socket": cpu_socket,
                    "brand": cpu_compat.get('cpu_brand'),
                    "generation": cpu_compat.get('cpu_generation'),
                },
                "mode": "strict",
                "compatible": compatible,
                "unknown": [],
            }
        else:
            # Lenient mode: include unknown motherboards
            unknown = self.compat_repo.find_motherboards_unknown_socket(
                max_confidence=0.70,
            )
            return {
                "cpu": {
                    "id": cpu_id,
                    "socket": cpu_socket,
                    "brand": cpu_compat.get('cpu_brand'),
                    "generation": cpu_compat.get('cpu_generation'),
                },
                "mode": "lenient",
                "compatible": compatible,
                "unknown": unknown,
            }
    
    def get_compatible_ram(
        self,
        motherboard_id: str,
        mode: str = 'strict',
    ) -> Dict[str, Any]:
        """
        Get RAM compatible with the given motherboard.
        
        Args:
            motherboard_id: Product ID of the selected motherboard
            mode: 'strict' or 'lenient'
        
        Returns:
            {
                "motherboard": {"id": ..., "memory_type": "DDR4"},
                "mode": "strict"|"lenient",
                "compatible": [...product_ids...],
                "unknown": [...product_ids...],
            }
        """
        # Get motherboard's compatibility record
        mobo_compat = self.compat_repo.get_by_product_id(motherboard_id)
        
        if not mobo_compat:
            return {
                "error": "Motherboard not found in compatibility database",
                "motherboard": {"id": motherboard_id, "memory_type": None},
                "mode": mode,
                "compatible": [],
                "unknown": [],
            }
        
        memory_type = mobo_compat.get('memory_type')
        
        if not memory_type:
            return {
                "error": "Motherboard memory type not available",
                "motherboard": {
                    "id": motherboard_id,
                    "memory_type": None,
                    "confidence": mobo_compat.get('confidence', 0),
                },
                "mode": mode,
                "compatible": [],
                "unknown": [],
            }
        
        max_speed = mobo_compat.get('memory_max_speed_mhz')
        
        # Query compatible RAM
        compatible = self.compat_repo.find_ram_by_type(
            memory_type=memory_type,
            max_speed=max_speed,
            min_confidence=0.70,
        )
        
        if mode == 'strict':
            return {
                "motherboard": {
                    "id": motherboard_id,
                    "memory_type": memory_type,
                    "max_speed_mhz": max_speed,
                    "max_capacity_gb": mobo_compat.get('memory_max_capacity_gb'),
                    "slots": mobo_compat.get('memory_slots'),
                },
                "mode": "strict",
                "compatible": compatible,
                "unknown": [],
            }
        else:
            unknown = self.compat_repo.find_ram_unknown_type(
                max_confidence=0.70,
            )
            return {
                "motherboard": {
                    "id": motherboard_id,
                    "memory_type": memory_type,
                    "max_speed_mhz": max_speed,
                    "max_capacity_gb": mobo_compat.get('memory_max_capacity_gb'),
                    "slots": mobo_compat.get('memory_slots'),
                },
                "mode": "lenient",
                "compatible": compatible,
                "unknown": unknown,
            }
    
    def get_component_compatibility_info(
        self,
        product_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get compatibility info for any component.
        
        Useful for displaying compatibility details on product pages.
        
        Args:
            product_id: Product UUID
            
        Returns:
            Compatibility data or None
        """
        return self.compat_repo.get_by_product_id(product_id)
    
    def save_compatibility_data(
        self,
        product_id: str,
        compat_data: Dict[str, Any],
    ) -> bool:
        """
        Save compatibility data for a product.
        
        Called by the ingestion pipeline after product creation.
        
        Args:
            product_id: Product UUID
            compat_data: Extracted compatibility attributes
            
        Returns:
            True if saved successfully
        """
        try:
            result = self.compat_repo.upsert(product_id, compat_data)
            return result is not None
        except Exception as e:
            logger.error(f"Error saving compat data for {product_id}: {e}")
            return False


# Global singleton instance
compatibility_service = CompatibilityService()
