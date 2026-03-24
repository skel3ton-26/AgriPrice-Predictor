"""
ML models: XGBoost + Exponential Smoothing ensemble.
Self-contained: generates its own clean price data, no CSV needed.
"""

import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")


COMMODITY_BASE = {
    "Onion":  1800,
    "Tomato": 2200,
    "Potato": 1200,
    "Wheat":  2100,
    "Rice":   3500,
    "Maize":  1600,
}

MARKET_FACTOR = {
    "Pune":      1.00,
    "Nashik":    0.95,
    "Delhi":     1.10,
    "Bangalore": 1.05,
    "Hyderabad": 1.02,
    "Chennai":   1.08,
    "Kolkata":   0.98,
    "Bhopal":    0.93,
}


def _generate_series(commodity: str, market: str, n: int = 500):
    """Generate a clean synthetic price series — no NaN, no infinity."""
    rng = np.random.default_rng(seed=abs(hash(commodity + market)) % (2**31))
    base = COMMODITY_BASE.get(commodity, 2000) * MARKET_FACTOR.get(market, 1.0)
    prices = [float(base)]
    for i in range(1, n):
        doy = (i % 365)
        season = 0.002 * np.sin(2 * np.pi * doy / 365)
        shock  = rng.normal(0, 0.008)
        trend  = 0.0002
        new_price = prices[-1] * (1 + season + shock + trend)
        new_price = max(new_price, base * 0.3)
        prices.append(round(float(new_price), 2))
    dates = pd.date_range(end=pd.Timestamp.today(), periods=n, freq="D")
    return pd.DataFrame({"date": dates, "price": prices})


def _make_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy().sort_values("date").reset_index(drop=True)
    p = df["price"]
    for lag in [1, 3, 7, 14, 30]:
        df[f"lag_{lag}"] = p.shift(lag)
    for w in [7, 14, 30]:
        df[f"rmean_{w}"] = p.rolling(w).mean()
        df[f"rstd_{w}"]  = p.rolling(w).std()
    df["doy_sin"] = np.sin(2 * np.pi * df["date"].dt.dayofyear / 365)
    df["doy_cos"] = np.cos(2 * np.pi * df["date"].dt.dayofyear / 365)
    df["month"]   = df["date"].dt.month
    df = df.dropna().reset_index(drop=True)
    return df


FEATURE_COLS = [
    "lag_1", "lag_3", "lag_7", "lag_14", "lag_30",
    "rmean_7", "rmean_14", "rmean_30",
    "rstd_7", "rstd_14", "rstd_30",
    "doy_sin", "doy_cos", "month",
]


def _fit_ets(series: np.ndarray):
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    s = pd.Series(series.astype(float))
    return ExponentialSmoothing(s, trend="add", seasonal=None).fit(optimized=True)


def _fit_xgb(feat: pd.DataFrame):
    from xgboost import XGBRegressor
    X = feat[FEATURE_COLS].values.astype(float)
    y = feat["price"].values.astype(float)
    model = XGBRegressor(
        n_estimators=200, learning_rate=0.05, max_depth=5,
        subsample=0.8, colsample_bytree=0.8, random_state=42
    )
    model.fit(X, y)
    return model


def _forecast_xgb(model, feat: pd.DataFrame, horizon: int) -> np.ndarray:
    df = feat.copy()
    preds = []
    for _ in range(horizon):
        last = df.iloc[-1]
        x = last[FEATURE_COLS].values.reshape(1, -1).astype(float)
        pred = float(model.predict(x)[0])
        preds.append(pred)
        new_row = last.copy()
        new_row["price"]   = pred
        new_row["lag_30"]  = last["lag_14"]
        new_row["lag_14"]  = last["lag_7"]
        new_row["lag_7"]   = last["lag_3"]
        new_row["lag_3"]   = last["lag_1"]
        new_row["lag_1"]   = last["price"]
        df = pd.concat([df, new_row.to_frame().T], ignore_index=True)
    return np.array(preds)


class EnsemblePredictor:
    def __init__(self, commodity: str, market: str = "Pune"):
        self.commodity = commodity
        self.market = market
        self._trained = False

    def _train(self):
        print(f"Training {self.commodity}/{self.market}...")
        raw = _generate_series(self.commodity, self.market, n=500)
        self._series = raw["price"].values.astype(float)
        self._dates  = raw["date"]
        feat = _make_features(raw)
        self._feat = feat
        self._ets = _fit_ets(self._series[-365:])
        self._xgb = _fit_xgb(feat)
        self._trained = True
        print("Training complete.")

    def forecast(self, horizon: int = 14):
        if not self._trained:
            self._train()

        ets_preds = np.array(self._ets.forecast(horizon))
        xgb_preds = _forecast_xgb(self._xgb, self._feat, horizon)
        ensemble  = 0.70 * xgb_preds + 0.30 * ets_preds

        recent_std    = float(np.std(self._series[-30:]))
        current_price = float(self._series[-1])
        trend_pct     = float((ensemble[-1] - current_price) / current_price * 100)

        if trend_pct > 5:
            signal, reason = "BUY",  f"Prices rising +{trend_pct:.1f}% — buy now before increase"
        elif trend_pct < -5:
            signal, reason = "SELL", f"Prices falling {trend_pct:.1f}% — sell before decline"
        else:
            signal, reason = "HOLD", f"Prices stable (±{abs(trend_pct):.1f}%) — monitor market"

        last_date = pd.Timestamp(self._dates.iloc[-1])
        forecast_dates = [
            (last_date + pd.Timedelta(days=i + 1)).strftime("%Y-%m-%d")
            for i in range(horizon)
        ]

        return {
            "commodity":     self.commodity,
            "market":        self.market,
            "horizon_days":  horizon,
            "dates":         forecast_dates,
            "ensemble":      [round(float(v), 2) for v in ensemble],
            "arima":         [round(float(v), 2) for v in ets_preds],
            "xgb":           [round(float(v), 2) for v in xgb_preds],
            "ci_lower":      [round(float(v), 2) for v in ensemble - 1.5 * recent_std],
            "ci_upper":      [round(float(v), 2) for v in ensemble + 1.5 * recent_std],
            "signal":        signal,
            "signal_reason": reason,
            "trend_pct":     round(trend_pct, 2),
            "current_price": round(current_price, 2),
            "unit":          "INR/quintal",
        }


_cache: dict[str, EnsemblePredictor] = {}

def get_predictor(commodity: str, market: str = "Pune") -> EnsemblePredictor:
    key = f"{commodity}_{market}"
    if key not in _cache:
        _cache[key] = EnsemblePredictor(commodity, market)
    return _cache[key]