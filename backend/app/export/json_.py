import json
from typing import Dict, Any

def export_capsule_json(capsule_spec: Dict[str, Any]) -> str:
    """Formats capsule regression spec as pretty JSON string."""
    return json.dumps(capsule_spec, indent=2, ensure_ascii=False)
