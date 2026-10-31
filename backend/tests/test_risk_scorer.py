"""
Tests for Flood Risk Scorer
Verifies:
1. Normal values calculate 0-100 scores
2. Four-level classification (green, yellow, orange, red)
3. Missing inputs handling (does not default to zero)
4. Official alert override precedence (cannot be downgraded)
"""
import pytest
from app.services.risk_scorer import compute_risk_score, RiskInputs, RiskScoreResult

def test_risk_score_low_conditions():
    inputs = RiskInputs(
        recent_rainfall_1h_mm=2.0,
        recent_rainfall_6h_mm=5.0,
        forecast_rainfall_24h_mm=10.0,
    )
    result = compute_risk_score(inputs)
    assert result.score is not None
    assert result.score < 25.0
    assert result.level == "green"
    assert result.displayed_level == "green"
    assert result.official_override is False

def test_risk_score_high_rainfall():
    inputs = RiskInputs(
        recent_rainfall_1h_mm=70.0,  # Extreme 1h rain
        recent_rainfall_6h_mm=130.0,
        forecast_rainfall_24h_mm=150.0,
    )
    result = compute_risk_score(inputs)
    assert result.score is not None
    assert result.score >= 70.0
    assert result.displayed_level in ["orange", "red"]

def test_official_warning_override():
    # Model inputs are low, but official severe alert is active
    inputs = RiskInputs(
        recent_rainfall_1h_mm=1.0,
        recent_rainfall_6h_mm=2.0,
        official_alert_level="extreme",
    )
    result = compute_risk_score(inputs)
    assert result.level == "green"
    assert result.displayed_level == "red"
    assert result.official_override is True
    assert "official extreme alert issued" in result.explanation

def test_missing_data_handling():
    # Absolutely no data inputs provided
    inputs = RiskInputs()
    result = compute_risk_score(inputs)
    assert result.score is None
    assert result.level == "unknown"
    assert len(result.missing_inputs) > 0
    assert "Insufficient data" in result.explanation
