"""
Feature engineering and data loading utilities.
"""

import numpy as np
import pandas as pd
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "commodity_prices.csv"


def load_data(commodity: str = None, market: str = None) -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    df = df.dropna().reset_index(drop=True)
    df = df.replace([np.inf, -np.inf], np.nan).dropna().reset_index(drop=True)
    if commodity:
        df = df[df["commodity"] == commodity]
    if market:
        df = df[df["market"] == market]
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy().sort_values("date").reset_index(drop=True)
    p = df["price"]

    # Lag features
    for lag in [1, 3, 7, 14, 30]:
        df[f"price_lag_{lag}"] = p.shift(lag)

    # Rolling stats
    for w in [7, 14, 30]:
        df[f"rolling_mean_{w}"] = p.rolling(w).mean()
        df[f"rolling_std_{w}"]  = p.rolling(w).std()

    # Momentum
    df["pct_change_7"]  = p.pct_change(7)
    df["pct_change_30"] = p.pct_change(30)

    # Calendar
    df["month_sin"] = np.sin(2 * np.pi * df["date"].dt.month / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["date"].dt.month / 12)
    df["doy_sin"]   = np.sin(2 * np.pi * df["date"].dt.dayofyear / 365)
    df["doy_cos"]   = np.cos(2 * np.pi * df["date"].dt.dayofyear / 365)
    df["day_of_week"] = df["date"].dt.dayofweek
    df["season"] = df["date"].dt.month.map(
        {12: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3}
    )

    df = df.dropna().reset_index(drop=True)
    return df


FEATURE_COLS = [
    "price_lag_1", "price_lag_3", "price_lag_7", "price_lag_14", "price_lag_30",
    "rolling_mean_7", "rolling_mean_14", "rolling_mean_30",
    "rolling_std_7", "rolling_std_14", "rolling_std_30",
    "pct_change_7", "pct_change_30",
    "month_sin", "month_cos", "doy_sin", "doy_cos",
    "day_of_week", "season",
]
