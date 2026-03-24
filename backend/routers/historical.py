from fastapi import APIRouter, Query
import numpy as np
import pandas as pd

router = APIRouter(prefix="/api/historical", tags=["historical"])

COMMODITIES = ["Onion", "Tomato", "Potato", "Wheat", "Rice", "Maize"]
MARKETS     = ["Pune", "Nashik", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Bhopal"]

COMMODITY_BASE = {
    "Onion":  1800, "Tomato": 2200, "Potato": 1200,
    "Wheat":  2100, "Rice":   3500, "Maize":  1600,
}
MARKET_FACTOR = {
    "Pune": 1.00, "Nashik": 0.95, "Delhi": 1.10,
    "Bangalore": 1.05, "Hyderabad": 1.02, "Chennai": 1.08,
    "Kolkata": 0.98, "Bhopal": 0.93,
}


def _generate_series(commodity: str, market: str, n: int = 500):
    rng  = np.random.default_rng(seed=abs(hash(commodity + market)) % (2**31))
    base = COMMODITY_BASE.get(commodity, 2000) * MARKET_FACTOR.get(market, 1.0)
    prices = [float(base)]
    for i in range(1, n):
        doy    = i % 365
        season = 0.002 * np.sin(2 * np.pi * doy / 365)
        shock  = rng.normal(0, 0.008)
        trend  = 0.0002
        price  = prices[-1] * (1 + season + shock + trend)
        prices.append(round(max(float(price), base * 0.3), 2))
    dates = pd.date_range(end=pd.Timestamp.today(), periods=n, freq="D")
    return pd.DataFrame({"date": dates, "price": prices})


@router.get("/prices")
def historical_prices(
    commodity: str = Query("Onion", enum=COMMODITIES),
    market:    str = Query("Pune",  enum=MARKETS),
    days:      int = Query(180, ge=30, le=1825),
):
    df = _generate_series(commodity, market).tail(days)
    return {
        "commodity": commodity,
        "market":    market,
        "dates":     df["date"].dt.strftime("%Y-%m-%d").tolist(),
        "prices":    df["price"].round(2).tolist(),
        "unit":      "INR/quintal",
    }


@router.get("/stats")
def historical_stats(
    commodity: str = Query("Onion", enum=COMMODITIES),
    market:    str = Query("Pune",  enum=MARKETS),
):
    df = _generate_series(commodity, market)
    p  = df["price"]

    monthly = (
        df.set_index("date")["price"]
        .resample("ME")
        .mean()
        .tail(12)
    )

    return {
        "commodity":   commodity,
        "market":      market,
        "min":         round(float(p.min()), 2),
        "max":         round(float(p.max()), 2),
        "mean":        round(float(p.mean()), 2),
        "std":         round(float(p.std()), 2),
        "latest":      round(float(p.iloc[-1]), 2),
        "unit":        "INR/quintal",
        "monthly_avg": {
            d.strftime("%b %Y"): round(float(v), 2)
            for d, v in monthly.items()
        },
    }
