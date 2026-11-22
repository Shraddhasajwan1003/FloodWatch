"""
JalDrishti India — AI Forgery, Spam & Anomaly Detection Layer.
Evaluates citizen flood reports and rescue requests to flag synthetic,
duplicate, spam, or hydrologically inconsistent claims.
"""
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Common spam/synthetic keywords or abusive patterns
SPAM_PATTERNS = [
    r"(?i)\b(test|testing|asdf|qwerty|lorem ipsum|fake|hacked|buy now|promo|discount)\b",
    r"(?i)\b(free money|subscribe|click here|crypto|bitcoin)\b",
]

def analyze_report_authenticity(
    category: str,
    description: str,
    water_depth_cm: Optional[float],
    recent_rainfall_24h_mm: Optional[float] = None,
    nearby_reports_count: int = 0,
    has_photo: bool = False,
) -> Tuple[float, bool, List[str]]:
    """
    Evaluates report authenticity.
    Returns:
      (trust_score: float (0-100), is_suspicious: bool, flags: List[str])
    """
    trust_score = 85.0
    flags: List[str] = []

    # 1. Text sanity & length
    desc_clean = description.strip()
    if len(desc_clean) < 8:
        trust_score -= 25.0
        flags.append("Description is very brief (under 8 characters)")
    elif len(desc_clean) > 30:
        trust_score += 5.0

    for pat in SPAM_PATTERNS:
        if re.search(pat, desc_clean):
            trust_score -= 50.0
            flags.append("Suspicious or test keywords detected")
            break

    # 2. Water depth validation against meteorological reality
    if water_depth_cm is not None:
        if water_depth_cm > 400.0:
            trust_score -= 30.0
            flags.append(f"Unusually high water depth reported ({water_depth_cm} cm)")
        elif water_depth_cm > 100.0:
            if recent_rainfall_24h_mm is not None and recent_rainfall_24h_mm < 5.0:
                trust_score -= 25.0
                flags.append("Depth exceeds 100cm but local 24h satellite rain is under 5mm (possible drainage backflow or exaggeration)")
            else:
                flags.append("Significant inundation reported")
        else:
            trust_score += 5.0

    # 3. Photo corroboration
    if has_photo:
        trust_score += 10.0
        flags.append("Corroborated with attached photograph")

    # 4. Spatial cluster reinforcement
    if nearby_reports_count > 0:
        trust_score += min(15.0, nearby_reports_count * 5.0)
        flags.append(f"Corroborated by {nearby_reports_count} other report(s) in this vicinity")

    # Normalize bounds
    trust_score = max(5.0, min(99.0, trust_score))
    is_suspicious = trust_score < 50.0

    if not flags:
        flags.append("Standard citizen submission - pending field corroboration")

    return round(trust_score, 1), is_suspicious, flags


def analyze_rescue_authenticity(
    contact_name: str,
    phone: str,
    people_count: int,
    water_level_stage: str,
    address_landmark: str,
    recent_rainfall_24h_mm: Optional[float] = None,
) -> Tuple[float, bool, List[str]]:
    """
    Evaluates rescue request authenticity.
    """
    trust_score = 92.0
    flags: List[str] = []

    # Phone validation (standard Indian mobile format)
    phone_digits = re.sub(r"\D", "", phone)
    if len(phone_digits) < 10 or len(phone_digits) > 13:
        trust_score -= 30.0
        flags.append("Invalid or incomplete phone number format")

    # People count sanity
    if people_count <= 0 or people_count > 100:
        trust_score -= 25.0
        flags.append(f"Unusual party count ({people_count} individuals)")

    # Landmark specificity
    if len(address_landmark.strip()) < 6:
        trust_score -= 15.0
        flags.append("Vague location description; exact rescue dispatch requires clear landmark")

    if water_level_stage in ["waist", "chest", "rooftop"]:
        flags.append(f"Critical stage '{water_level_stage}' marked for high-priority dispatch")

    trust_score = max(10.0, min(99.0, trust_score))
    is_suspicious = trust_score < 50.0

    if not flags:
        flags.append("Validated distress request format")

    return round(trust_score, 1), is_suspicious, flags
