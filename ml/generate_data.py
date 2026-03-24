"""
Synthetic Agmarknet-style price data generator.
Run: python ml/generate_data.py
Creates ml/data/commodity_prices.csv
"""

import numpy as np
import pandas as pd
from pathlib import Path
import random

random.seed(42)
np.random.seed(42)

COMMODITIES = {
    "Onion":   {"base": 1800, "seasonality": 0.35, "volatility": 0.12},
    "Tomato":  {"base": 2200, "seasonality": 0.50, "volatility": 0.20},
    "Potato":  {"base": 1200, "seasonality": 0.20, "volatility": 0.08},
    "Wheat":   {"base": 2100, "seasonality": 0.10, "volatility": 0.05},
    "Rice":    {"base": 3500, "seasonality": 0.08, "volatility": 0.04},
    "Maize":   {"base": 1600, "seasonality": 0.15, "volatility": 0.07},
}

MARKETS = {
    "Pune":      1.00,
    "Nashik":    0.95,
    "Delhi":     1.10,
    "Bangalore": 1.05,
    "Hyderabad": 1.02,
    "Chennai":   1.08,
    "Kolkata":   0.98,
    "Bhopal":    0.93,
}

def generate_price_series(base, seasonality, volatility, dates, market_factor):
    n = len(dates)
    prices = []
    price = base * market_factor

    for i, date in enumerate(dates):
        # Seasonal component (annual cycle)
        doy = date.dayofyear
        season = seasonality * np.sin(2 * np.pi * doy / 365 - np.pi / 2)

        # Monthly trend variation
        monthly = 0.05 * np.sin(2 * np.pi * date.month / 12)

        # Random shock
        shock = np.random.normal(0, volatility)

        # Slow trend drift
        trend = 0.0003 * i

        # Price update
        price = price * (1 + season * 0.01 + monthly * 0.01 + shock * 0.01 + trend)
        price = max(price, base * market_factor * 0.3)  # floor
        prices.append(round(price, 2))

    return prices


def main():
    out_dir = Path(__file__).parent / "data"
    out_dir.mkdir(exist_ok=True)

    dates = pd.date_range("2021-01-01", "2026-03-20", freq="D")
    rows = []

    for commodity, cfg in COMMODITIES.items():
        for market, mfactor in MARKETS.items():
            prices = generate_price_series(
                cfg["base"], cfg["seasonality"], cfg["volatility"], dates, mfactor
            )
            for date, price in zip(dates, prices):
                rows.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "commodity": commodity,
                    "market": market,
                    "price": price,
                    "unit": "INR/quintal",
                })

    df = pd.DataFrame(rows)
    out_path = out_dir / "commodity_prices.csv"
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df):,} rows → {out_path}")


if __name__ == "__main__":
    main()
