"""Prediction logic shared by the FastAPI /predict endpoint."""
from __future__ import annotations

from typing import Any

import numpy as np


BASE_MEMBERSHIP_HISTORY = [
    {"season": "2023-2024", "members": 163},
    {"season": "2024-2025", "members": 97},
    {"season": "2025-2026", "members": 83},
]


def _arima_one_step_forecast(arima) -> float:
    """Extrait une prévision 1 pas quels que soient ndarray, Series statsmodels ou anciens résultats."""
    fc = arima.forecast(steps=1)
    if hasattr(fc, "iloc"):
        return float(fc.iloc[0])
    if hasattr(fc, "predicted_mean") and fc.predicted_mean is not None:
        pm = fc.predicted_mean
        return float(pm.iloc[0] if hasattr(pm, "iloc") else pm[0])
    arr = np.asarray(fc, dtype=np.float64).reshape(-1)
    if arr.size == 0:
        raise ValueError("ARIMA forecast returned empty series")
    return float(arr[0])


def _next_season_label(season: str) -> str:
    try:
        start, end = season.split("-", 1)
        return f"{int(start) + 1}-{int(end) + 1}"
    except Exception:
        return "Next season"


def _payload_membership_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("extra_membership_data")
    if not isinstance(raw, list):
        return []

    rows: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        season = item.get("season")
        members = item.get("members")
        if not isinstance(season, str):
            continue
        try:
            member_count = int(members)
        except (TypeError, ValueError):
            continue
        if member_count <= 0:
            continue
        rows.append({"season": season, "members": member_count})
    return rows


def _forecast_from_uploaded_rows(values: list[int], fallback: float) -> float:
    if len(values) < 2:
        return fallback
    recent = np.asarray(values[-3:], dtype=np.float64)
    x = np.arange(recent.size, dtype=np.float64)
    slope, intercept = np.polyfit(x, recent, 1)
    trend_forecast = float(intercept + slope * recent.size)
    # Blend the uploaded trend with the baseline model to keep changes controlled.
    return max(1.0, (trend_forecast * 0.7) + (fallback * 0.3))


def run_membership_forecast(models: dict, data: dict[str, Any] | None = None) -> dict[str, Any]:
    forecast_val = _arima_one_step_forecast(models["arima"])
    uploaded_rows = _payload_membership_rows(data or {})
    history_rows = [*BASE_MEMBERSHIP_HISTORY, *uploaded_rows]
    historical = [int(row["members"]) for row in history_rows]
    last_actual = historical[-1]
    if uploaded_rows:
        forecast_val = _forecast_from_uploaded_rows(historical, forecast_val)
    seasons = [str(row["season"]) for row in history_rows]
    seasons.append(_next_season_label(seasons[-1]))
    return {
        "projected_membership": round(forecast_val),
        "historical": historical,
        "seasons": seasons,
        "trajectory_summary": "Recovery expected" if forecast_val > last_actual else "Continued decline",
        "change_pct": round(((forecast_val - last_actual) / last_actual) * 100, 1),
    }


def run_participation_trends(models: dict, data: dict) -> dict[str, Any]:
    features = np.array(
        [
            [
                float(data.get("views", 0)),
                float(data.get("likes", 0)),
                float(data.get("comments", 0)),
                float(data.get("engagement_rate", 0)),
                float(data.get("visibility_index", 0)),
            ]
        ]
    )
    label = int(models["kmeans"].predict(features)[0])
    outlook_titles = {0: "Steady reach", 1: "Broad visibility"}
    outlook_detail = {
        0: "Standard performance. Focus on content quality and posting frequency to grow.",
        1: "Viral / High-Reach content. Maintain strategy and replicate winning formats.",
    }
    guidance = (
        "Prioritize formats and cadence that lift reach toward the broader pattern."
        if label == 0
        else "You are already seeing the strongest engagement pattern."
    )
    return {
        "signal": label,
        "outlook_title": outlook_titles.get(label, f"Band {label}"),
        "outlook_detail": outlook_detail.get(label, ""),
        "guidance": guidance,
    }


def run_operational_outlook(models: dict, data: dict) -> dict[str, Any]:
    season = float(data.get("season", 2024))
    flowtype = float(data.get("flowtype", 1))
    subcat = float(data.get("budget_sub_category", 1))
    budget_month = float(data.get("budget_month", 6))
    participants = float(data.get("participants", 30))
    duration = float(data.get("duration_days", 3))
    features = np.array(
        [
            [
                season,
                flowtype,
                subcat,
                budget_month,
                participants,
                participants,
                duration,
                duration,
            ]
        ]
    )
    log_pred = models["regression_rf"].predict(features)[0]
    pred_cost_per_person_day = float(np.expm1(log_pred))
    total_budget = pred_cost_per_person_day * participants * duration
    return {
        "cost_per_person_day": round(pred_cost_per_person_day, 2),
        "total_budget": round(total_budget, 2),
        "participants": int(participants),
        "duration": int(duration),
        "currency": "TND",
    }


def run_strategic_recommendations(models: dict, data: dict) -> dict[str, Any]:
    features = np.array(
        [
            [
                float(data.get("members_count", 30)),
                float(data.get("leaders_count", 3)),
                float(data.get("leaders_to_members_ratio", 0.1)),
                float(data.get("activities_per_member", 2)),
                float(data.get("female_ratio", 0.4)),
                float(data.get("activity_count", 10)),
            ]
        ]
    )
    clf = models["classification_lr"]
    pred = int(clf.predict(features)[0])
    proba = clf.predict_proba(features)[0].tolist()
    level_map = {0: "Low", 1: "Medium", 2: "High"}
    color_map = {0: "#E74C3C", 1: "#F39C12", 2: "#27AE60"}
    advice_map = {
        0: "Unit needs urgent support. Consider increasing leader-to-member ratio and scheduling more structured activities.",
        1: "Unit shows moderate engagement. Focus on retention and activity diversity to reach High level.",
        2: "Unit is performing excellently. Share best practices with other units.",
    }
    return {
        "priority_level": pred,
        "priority_label": level_map[pred],
        "accent_color": color_map[pred],
        "confidence_breakdown": {level_map[i]: round(p * 100, 1) for i, p in enumerate(proba)},
        "executive_guidance": advice_map[pred],
    }
