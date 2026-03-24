from fastapi import APIRouter, Query
from ml.models import get_predictor

router = APIRouter(prefix="/api/predict", tags=["predict"])

COMMODITIES = ["Onion", "Tomato", "Potato", "Wheat", "Rice", "Maize"]
MARKETS     = ["Pune", "Nashik", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Bhopal"]


@router.get("/forecast")
def forecast(
    commodity: str = Query("Onion", enum=COMMODITIES),
    market:    str = Query("Pune",  enum=MARKETS),
    horizon:   int = Query(14, ge=1, le=60),
):
    predictor = get_predictor(commodity, market)
    return predictor.forecast(horizon)


@router.get("/compare")
def compare(
    market:  str = Query("Pune", enum=MARKETS),
    horizon: int = Query(14, ge=1, le=60),
):
    results = []
    for commodity in COMMODITIES:
        predictor = get_predictor(commodity, market)
        fc = predictor.forecast(horizon)
        results.append({
            "commodity":     fc["commodity"],
            "signal":        fc["signal"],
            "signal_reason": fc["signal_reason"],
            "trend_pct":     fc["trend_pct"],
            "current_price": fc["current_price"],
            "forecast_end":  fc["ensemble"][-1],
            "unit":          fc["unit"],
        })
    return {"market": market, "horizon_days": horizon, "commodities": results}
