"""
Compatibility Repository for product_compat data access.

Handles all direct Supabase queries for compatibility data used in
context-aware component filtering.
"""

import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class CompatibilityRepository:
    """
    Repository for product_compat table operations.
    
    Provides methods for:
    - Upserting compatibility data for products
    - Querying compatible components by socket/memory type
    - Finding products with unknown compatibility
    """
    
    def __init__(self):
        self._client = None
    
    @property
    def client(self):
        """Lazy-load the Supabase client on first access."""
        if self._client is None:
            from core.infrastructure.supabase.client import get_supabase_client
            self._client = get_supabase_client()
        return self._client

    
    def upsert(self, product_id: str, compat_data: Dict[str, Any]) -> Optional[Dict]:
        """
        Insert or update compatibility data for a product.
        
        Args:
            product_id: Product UUID
            compat_data: Dict containing compatibility fields
            
        Returns:
            The upserted record, or None on failure
        """
        try:
            # Prepare data with product_id
            data = {
                'product_id': product_id,
                **compat_data,
            }
            
            # Remove None values to avoid overwriting with nulls
            data = {k: v for k, v in data.items() if v is not None}
            
            result = (
                self.client.table('product_compat')
                .upsert(data, on_conflict='product_id')
                .execute()
            )
            
            if result.data:
                logger.debug(f"Upserted compat for product {product_id}")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error upserting compat for {product_id}: {e}")
            return None
    
    def get_by_product_id(self, product_id: str) -> Optional[Dict]:
        """
        Get compatibility data for a specific product.
        
        Args:
            product_id: Product UUID
            
        Returns:
            Compatibility record or None if not found
        """
        try:
            result = (
                self.client.table('product_compat')
                .select('*')
                .eq('product_id', product_id)
                .single()
                .execute()
            )
            return result.data
        except Exception as e:
            logger.error(f"Error getting compat for {product_id}: {e}")
            return None
    
    def find_by_socket(
        self,
        socket: str,
        component_type: str,
        min_confidence: float = 0.70,
    ) -> List[str]:
        """
        Find product IDs by socket type.
        
        Args:
            socket: Socket type (e.g., 'AM4', 'LGA1700')
            component_type: 'cpu' or 'motherboard'
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of product IDs
        """
        try:
            socket_field = 'cpu_socket' if component_type == 'cpu' else 'mobo_socket'
            
            result = (
                self.client.table('product_compat')
                .select('product_id')
                .eq('component_type', component_type)
                .eq(socket_field, socket)
                .gte('confidence', min_confidence)
                .execute()
            )
            
            return [r['product_id'] for r in result.data] if result.data else []
            
        except Exception as e:
            logger.error(f"Error finding by socket {socket}: {e}")
            return []
    
    def find_motherboards_by_socket(
        self,
        socket: str,
        min_confidence: float = 0.70,
    ) -> List[str]:
        """
        Find motherboard product IDs compatible with a CPU socket.
        
        Args:
            socket: CPU socket type (e.g., 'AM4')
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of motherboard product IDs
        """
        return self.find_by_socket(socket, 'motherboard', min_confidence)
    
    def find_motherboards_unknown_socket(
        self,
        max_confidence: float = 0.70,
    ) -> List[str]:
        """
        Find motherboards with unknown or low-confidence socket info.
        
        Args:
            max_confidence: Maximum confidence to be considered "unknown"
            
        Returns:
            List of product IDs
        """
        try:
            # Products with null socket OR low confidence
            result = (
                self.client.table('product_compat')
                .select('product_id')
                .eq('component_type', 'motherboard')
                .lt('confidence', max_confidence)
                .execute()
            )
            
            return [r['product_id'] for r in result.data] if result.data else []
            
        except Exception as e:
            logger.error(f"Error finding unknown motherboards: {e}")
            return []
    
    def find_all_motherboards(self) -> List[str]:
        """
        Get all motherboard product IDs (regardless of socket).
        
        Used as a fallback when CPU socket info is not available.
        
        Returns:
            List of motherboard product IDs
        """
        try:
            result = (
                self.client.table('product_compat')
                .select('product_id')
                .eq('component_type', 'motherboard')
                .execute()
            )
            
            return [r['product_id'] for r in result.data] if result.data else []
            
        except Exception as e:
            logger.error(f"Error finding all motherboards: {e}")
            return []
    
    def find_ram_by_type(
        self,
        memory_type: str,
        max_speed: Optional[int] = None,
        min_confidence: float = 0.70,
    ) -> List[str]:
        """
        Find RAM product IDs compatible with a motherboard.
        
        Args:
            memory_type: DDR type ('DDR4' or 'DDR5')
            max_speed: Optional max speed the motherboard supports
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of RAM product IDs
        """
        try:
            query = (
                self.client.table('product_compat')
                .select('product_id')
                .eq('component_type', 'ram')
                .eq('memory_type', memory_type)
                .gte('confidence', min_confidence)
            )
            
            # If max_speed provided, filter RAM that doesn't exceed it
            # (RAM can run at lower speeds, so this is optional)
            if max_speed:
                query = query.lte('memory_max_speed_mhz', max_speed)
            
            result = query.execute()
            return [r['product_id'] for r in result.data] if result.data else []
            
        except Exception as e:
            logger.error(f"Error finding RAM by type {memory_type}: {e}")
            return []
    
    def find_ram_unknown_type(
        self,
        max_confidence: float = 0.70,
    ) -> List[str]:
        """
        Find RAM with unknown or low-confidence type info.
        
        Returns:
            List of product IDs
        """
        try:
            result = (
                self.client.table('product_compat')
                .select('product_id')
                .eq('component_type', 'ram')
                .lt('confidence', max_confidence)
                .execute()
            )
            
            return [r['product_id'] for r in result.data] if result.data else []
            
        except Exception as e:
            logger.error(f"Error finding unknown RAM: {e}")
            return []
    
    def get_cpu_socket(self, product_id: str) -> Optional[str]:
        """
        Get the socket type for a CPU product.
        
        Args:
            product_id: CPU product UUID
            
        Returns:
            Socket string or None
        """
        compat = self.get_by_product_id(product_id)
        if compat and compat.get('component_type') == 'cpu':
            return compat.get('cpu_socket')
        return None
    
    def get_motherboard_memory_type(self, product_id: str) -> Optional[str]:
        """
        Get the memory type for a motherboard product.
        
        Args:
            product_id: Motherboard product UUID
            
        Returns:
            Memory type ('DDR4', 'DDR5') or None
        """
        compat = self.get_by_product_id(product_id)
        if compat and compat.get('component_type') == 'motherboard':
            return compat.get('memory_type')
        return None
    
    def bulk_upsert(
        self,
        records: List[Dict[str, Any]],
    ) -> int:
        """
        Bulk upsert multiple compatibility records.
        
        Args:
            records: List of dicts with product_id and compat fields
            
        Returns:
            Number of successfully upserted records
        """
        success_count = 0
        for record in records:
            product_id = record.get('product_id')
            if product_id:
                result = self.upsert(product_id, record)
                if result:
                    success_count += 1
        return success_count


# Global singleton instance
compat_repository = CompatibilityRepository()
