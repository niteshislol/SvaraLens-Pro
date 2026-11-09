from typing import Dict, Any, Optional
from pydantic import BaseModel

class CheckResult(BaseModel):
    check_type: str
    status: str       # 'WARN', 'SUSPECTED', 'FAIL'
    severity: str     # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    evidence: Dict[str, Any]
    region_start_s: Optional[float] = None
    region_end_s: Optional[float] = None
    reviewer_note: Optional[str] = None
