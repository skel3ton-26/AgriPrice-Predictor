from fastapi import APIRouter, Query
from ml.utils.data_loader import load_data

router = APIRouter(prefix="/api/historical", tags=["historical"])

COMMODITIES = ["Onion", "Tomato", "Potato", "Wheat", "Rice", "Maize"]
MARKETS     = ["Pune", "Nashik", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Bhopal"]


@router.get("/prices")
def historical_prices(
    commodity: str = Query("Onion", enum=COMMODITIES),
    market:    str = Query("Pune",  enum=MARKETS),
    days:      int = Query(180, ge=30, le=1825),
):
    df = load_data(commodity, market).tail(days)
    return {
        "commodity": commodity,
        "market": market,
        "dates":  df["date"].dt.strftime("%Y-%m-%d").tolist(),
        "prices": df["price"].round(2).tolist(),
        "unit":   "INR/quintal",
    }


@router.get("/stats")
def historical_stats(
    commodity: str = Query("Onion", enum=COMMODITIES),
    market:    str = Query("Pune",  enum=MARKETS),
):
    df = load_data(commodity, market)
    p = df["price"]

    monthly = (
        df.set_index("date")["price"]
        .resample("ME")
        .mean()
        .tail(12)
    )

    return {
        "commodity":  commodity,
        "market":     market,
        "min":        round(float(p.min()), 2),
        "max":        round(float(p.max()), 2),
        "mean":       round(float(p.mean()), 2),
        "std":        round(float(p.std()), 2),
        "latest":     round(float(p.iloc[-1]), 2),
        "unit":       "INR/quintal",
        "monthly_avg": {
            d.strftime("%b %Y"): round(float(v), 2)
            for d, v in monthly.items()
        },
    }
