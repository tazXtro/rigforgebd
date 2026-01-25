"""
Shared loader for external normalizer data.
"""

import json
from pathlib import Path
from typing import Any, Dict

_DATA_CACHE: Dict[str, Dict[str, Any]] = {}


def load_normalizer_data(name: str) -> Dict[str, Any]:
    """
    Load normalizer data from JSON files with caching.

    Args:
        name: Data file base name (e.g., "cpu", "motherboard", "ram")

    Returns:
        Parsed JSON data as dict.
    """
    if name in _DATA_CACHE:
        return _DATA_CACHE[name]

    data_dir = Path(__file__).resolve().parent / "data"
    data_path = data_dir / f"{name}.json"

    with data_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    _DATA_CACHE[name] = data
    return data
