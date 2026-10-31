"""
FloodWatch India — Flood risk scoring service.

This module implements the four-level (GREEN/YELLOW/ORANGE/RED) risk classification.

Design principles:
1. Each input is independently nullable — missing data is explicitly handled,
   never defaulted to a low-risk score.
2. Weights are configurable outside UI components.
3. The scoring model is rule-based (v1). ML additions will be clearly versioned.
4. A valid official severe warning CANNOT be downgraded by the internal score.
5. A risk score of UNKNOWN is returned when insufficient data is available
   to produce a defensible estimate.

Score band thresholds (provisional, for MVP calibration):
  0–24:  GREEN  (Below warning)
  25–49: YELLOW (Watch)
  50–74: ORANGE (High risk)
  75–100: RED   (Severe risk)

These are not calibrated against historical outcomes yet. They are labelled
PROVISIONAL until formal validation is completed.
"""
from dataclasses import dataclass, field
from typing import Dict, Optional

# ── Risk classification thresholds ────────────────────────────────────────────
# These should be externalized to config once calibrated.
SCORE_THRESHOLDS = {
    "green": (0, 24),
    "yellow": (25, 49),
    "orange": (50, 74),
    "red": (75, 100),
}

# ── Model weights (sum to 1.0) ─────────────────────────────────────────────────
# Each weight represents the contribution of that input to the final risk score.
WEIGHTS: Dict[str, float] = {
    "recent_rainfall_1h": 0.25,       # mm in last hour
    "recent_rainfall_6h": 0.20,       # mm in last 6 hours
    "forecast_rainfall_24h": 0.15,    # mm forecast next 24h
    "river_level_pct": 0.20,          # % of danger level
    "river_rise_rate": 0.10,          # m/h rise rate
    "community_reports": 0.10,        # recent credible reports
}

# ── Input normalization: maps raw values to 0–100 ─────────────────────────────
# Based on IMD and CWC threshold conventions (approximate for MVP).
RAINFALL_1H_BOUNDS = {"low": 7.5, "moderate": 35.5, "heavy": 64.4, "extreme": 124.4}
RAINFALL_6H_BOUNDS = {"low": 15, "moderate": 65, "heavy": 115, "extreme": 204}
RAINFALL_24H_BOUNDS = {"low": 15, "moderate": 65, "heavy": 115, "extreme": 204}
REPORT_COUNT_MAX = 10  # Saturates at 10 credible reports


@dataclass
class RiskInputs:
    """
    Container for all risk-scoring inputs.
    Every field is Optional — None means 'data unavailable', not 'no risk'.
    """
    recent_rainfall_1h_mm: Optional[float] = None
    recent_rainfall_6h_mm: Optional[float] = None
    forecast_rainfall_24h_mm: Optional[float] = None
    river_level_m: Optional[float] = None
    river_danger_level_m: Optional[float] = None  # Station-specific threshold
    river_rise_rate_m_per_h: Optional[float] = None
    recent_credible_report_count: Optional[int] = None
    official_alert_level: Optional[str] = None  # "watch" | "warning" | "severe" | "extreme"


@dataclass
class RiskScoreResult:
    """
    Complete result of risk scoring including breakdown for transparency.
    """
    score: Optional[float]          # 0–100 or None if insufficient data
    level: str                       # "green" | "yellow" | "orange" | "red" | "unknown"
    displayed_level: str             # May be overridden by official alert
    official_override: bool          # True if official alert raised the level
    model_version: str
    is_provisional: bool             # True during MVP; False after calibration
    breakdown: Dict[str, Optional[float]]  # Component scores for transparency
    missing_inputs: list[str]        # Which inputs were absent
    explanation: str                 # Human-readable reason


def _normalize_rainfall(mm: float, bounds: dict) -> float:
    """Normalize rainfall mm to 0–100 score using defined thresholds."""
    if mm <= 0:
        return 0.0
    if mm <= bounds["low"]:
        return (mm / bounds["low"]) * 25
    if mm <= bounds["moderate"]:
        return 25 + ((mm - bounds["low"]) / (bounds["moderate"] - bounds["low"])) * 25
    if mm <= bounds["heavy"]:
        return 50 + ((mm - bounds["moderate"]) / (bounds["heavy"] - bounds["moderate"])) * 25
    if mm <= bounds["extreme"]:
        return 75 + ((mm - bounds["heavy"]) / (bounds["extreme"] - bounds["heavy"])) * 24
    return 99.0  # Cap at 99 — 100 is reserved for confirmed major events


def _score_to_level(score: float) -> str:
    for level, (lo, hi) in SCORE_THRESHOLDS.items():
        if lo <= score <= hi:
            return level
    return "unknown"


def _official_to_level(alert: str) -> str:
    mapping = {
        "watch": "yellow",
        "warning": "orange",
        "severe": "orange",
        "extreme": "red",
    }
    return mapping.get(alert.lower(), "unknown")


def compute_risk_score(inputs: RiskInputs) -> RiskScoreResult:
    """
    Compute flood risk score from available inputs.

    Returns a RiskScoreResult with score, level, breakdown, and explanation.
    Missing inputs are explicitly listed; they do not silently default to zero risk.
    """
    breakdown: Dict[str, Optional[float]] = {}
    missing_inputs: list[str] = []
    weighted_sum = 0.0
    weight_used = 0.0

    # ── Recent rainfall (1h) ──────────────────────────────────────────────────
    if inputs.recent_rainfall_1h_mm is not None:
        s = _normalize_rainfall(inputs.recent_rainfall_1h_mm, RAINFALL_1H_BOUNDS)
        breakdown["recent_rainfall_1h"] = s
        weighted_sum += s * WEIGHTS["recent_rainfall_1h"]
        weight_used += WEIGHTS["recent_rainfall_1h"]
    else:
        breakdown["recent_rainfall_1h"] = None
        missing_inputs.append("recent_rainfall_1h")

    # ── Recent rainfall (6h) ──────────────────────────────────────────────────
    if inputs.recent_rainfall_6h_mm is not None:
        s = _normalize_rainfall(inputs.recent_rainfall_6h_mm, RAINFALL_6H_BOUNDS)
        breakdown["recent_rainfall_6h"] = s
        weighted_sum += s * WEIGHTS["recent_rainfall_6h"]
        weight_used += WEIGHTS["recent_rainfall_6h"]
    else:
        breakdown["recent_rainfall_6h"] = None
        missing_inputs.append("recent_rainfall_6h")

    # ── Forecast rainfall (24h) ────────────────────────────────────────────────
    if inputs.forecast_rainfall_24h_mm is not None:
        s = _normalize_rainfall(inputs.forecast_rainfall_24h_mm, RAINFALL_24H_BOUNDS)
        breakdown["forecast_rainfall_24h"] = s
        weighted_sum += s * WEIGHTS["forecast_rainfall_24h"]
        weight_used += WEIGHTS["forecast_rainfall_24h"]
    else:
        breakdown["forecast_rainfall_24h"] = None
        missing_inputs.append("forecast_rainfall_24h")

    # ── River level (% of danger level) ──────────────────────────────────────
    if inputs.river_level_m is not None and inputs.river_danger_level_m is not None and inputs.river_danger_level_m > 0:
        pct = (inputs.river_level_m / inputs.river_danger_level_m) * 100
        s = min(pct, 100.0)
        breakdown["river_level_pct"] = s
        weighted_sum += s * WEIGHTS["river_level_pct"]
        weight_used += WEIGHTS["river_level_pct"]
    else:
        breakdown["river_level_pct"] = None
        missing_inputs.append("river_level_pct")

    # ── River rise rate ───────────────────────────────────────────────────────
    if inputs.river_rise_rate_m_per_h is not None:
        # Significant rise rate: > 0.3 m/h is high concern
        rate = max(0.0, inputs.river_rise_rate_m_per_h)
        s = min((rate / 0.5) * 100, 100.0)
        breakdown["river_rise_rate"] = s
        weighted_sum += s * WEIGHTS["river_rise_rate"]
        weight_used += WEIGHTS["river_rise_rate"]
    else:
        breakdown["river_rise_rate"] = None
        missing_inputs.append("river_rise_rate")

    # ── Community reports ─────────────────────────────────────────────────────
    if inputs.recent_credible_report_count is not None:
        s = min((inputs.recent_credible_report_count / REPORT_COUNT_MAX) * 100, 100.0)
        breakdown["community_reports"] = s
        weighted_sum += s * WEIGHTS["community_reports"]
        weight_used += WEIGHTS["community_reports"]
    else:
        breakdown["community_reports"] = None
        missing_inputs.append("community_reports")

    # ── Compute final score ────────────────────────────────────────────────────
    # We need at least rainfall OR river data to produce a defensible score.
    has_rainfall = (
        inputs.recent_rainfall_1h_mm is not None
        or inputs.recent_rainfall_6h_mm is not None
        or inputs.forecast_rainfall_24h_mm is not None
    )
    has_river = (
        inputs.river_level_m is not None
        and inputs.river_danger_level_m is not None
    )

    if not has_rainfall and not has_river:
        score = None
        computed_level = "unknown"
    elif weight_used > 0:
        # Normalize to total available weight (missing inputs don't contribute)
        score = round(weighted_sum / weight_used, 1)
        computed_level = _score_to_level(score)
    else:
        score = None
        computed_level = "unknown"

    # ── Apply official alert override ──────────────────────────────────────────
    # Official severe/extreme warnings cannot be downgraded by internal score.
    official_level = None
    official_override = False
    if inputs.official_alert_level:
        official_level = _official_to_level(inputs.official_alert_level)

    displayed_level = computed_level
    level_order = ["unknown", "green", "yellow", "orange", "red"]
    if official_level and level_order.index(official_level) > level_order.index(computed_level):
        displayed_level = official_level
        official_override = True

    # ── Build explanation ──────────────────────────────────────────────────────
    explanation_parts = []
    if score is not None:
        if breakdown.get("recent_rainfall_1h") and breakdown["recent_rainfall_1h"] > 50:
            explanation_parts.append("intense rainfall in the last hour")
        if breakdown.get("recent_rainfall_6h") and breakdown["recent_rainfall_6h"] > 50:
            explanation_parts.append("significant accumulated rainfall over 6 hours")
        if breakdown.get("forecast_rainfall_24h") and breakdown["forecast_rainfall_24h"] > 50:
            explanation_parts.append("heavy rainfall forecast in the next 24 hours")
        if breakdown.get("river_level_pct") and breakdown["river_level_pct"] > 75:
            explanation_parts.append("river level near or above danger threshold")
        if breakdown.get("community_reports") and breakdown["community_reports"] > 30:
            explanation_parts.append("recent community waterlogging reports")
    if official_override:
        explanation_parts.insert(0, f"official {inputs.official_alert_level} alert issued")

    if not explanation_parts:
        if score is None:
            explanation = "Insufficient data to compute a risk estimate."
        else:
            explanation = "All measured inputs are within normal ranges."
    else:
        explanation = "Elevated risk due to: " + "; ".join(explanation_parts) + "."

    if missing_inputs:
        explanation += f" (Missing inputs: {', '.join(missing_inputs)}; score is provisional.)"

    return RiskScoreResult(
        score=score,
        level=computed_level,
        displayed_level=displayed_level,
        official_override=official_override,
        model_version="rule-based-v1",
        is_provisional=True,  # Will be False after calibration validation
        breakdown=breakdown,
        missing_inputs=missing_inputs,
        explanation=explanation,
    )
