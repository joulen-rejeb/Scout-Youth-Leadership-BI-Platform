"""Seuils simples : latence, confiance, champs manquants, proxy précision ; logs structurés."""
from __future__ import annotations

import logging
import os
import time
from collections import deque
from typing import Any

from ml_backend.monitoring import metrics as m

LOG = logging.getLogger("scout.monitoring")

# Baselines (comparaison livrable S13 — surchargeables par variables d’environnement)
BASELINE_CONFIDENCE_PCT = float(os.environ.get("SCOUT_BASELINE_CONFIDENCE_PCT", "50"))
BASELINE_LATENCY_MS = float(os.environ.get("SCOUT_BASELINE_LATENCY_MS", "2000"))
BASELINE_ACCURACY_RATIO = float(os.environ.get("SCOUT_BASELINE_ACCURACY_RATIO", "1.0"))
CONFIDENCE_DROP_PCT = float(os.environ.get("SCOUT_CONFIDENCE_DROP_ALERT_PCT", "5"))
MISSING_DATA_ALERT = float(os.environ.get("SCOUT_MISSING_FEATURES_ALERT", "0.25"))

_recent_max_conf: deque[float] = deque(maxlen=100)


def _payload_missing_ratio(task: str, payload: dict[str, Any]) -> float:
    expected: dict[str, list[str]] = {
        "operational_outlook": [
            "season",
            "flowtype",
            "budget_sub_category",
            "budget_month",
            "participants",
            "duration_days",
        ],
        "participation_trends": [
            "views",
            "likes",
            "comments",
            "engagement_rate",
            "visibility_index",
        ],
        "strategic_recommendations": [
            "members_count",
            "leaders_count",
            "leaders_to_members_ratio",
            "activities_per_member",
            "female_ratio",
            "activity_count",
        ],
        "membership_forecast": [],
    }
    keys = expected.get(task, [])
    if not keys:
        return 0.0
    missing = 0
    for k in keys:
        if k not in payload or payload[k] is None or payload[k] == "":
            missing += 1
    return missing / len(keys)


def _freshness_seconds(task: str, payload: dict[str, Any]) -> float:
    ts = payload.get("observed_at")
    if ts is None:
        return -1.0
    try:
        return max(0.0, time.time() - float(ts))
    except (TypeError, ValueError):
        return -1.0


def _rolling_accuracy_proxy() -> float:
    """Proxy : moyenne des dernières confiances max (strategic) / baseline."""
    if not _recent_max_conf:
        return BASELINE_ACCURACY_RATIO
    avg = sum(_recent_max_conf) / len(_recent_max_conf)
    if BASELINE_CONFIDENCE_PCT <= 0:
        return 1.0
    return max(0.0, min(2.0, avg / BASELINE_CONFIDENCE_PCT))


def _apply_simulation_flags() -> None:
    for s in ("latency", "confidence", "accuracy"):
        active = os.environ.get(f"SCOUT_SIM_{s.upper()}", "") == "1"
        m.SIMULATION_ACTIVE.labels(scenario=s).set(1 if active else 0)


def observe_predict_outcome(
    *,
    task: str,
    status_code: int,
    latency_seconds: float,
    payload: dict[str, Any],
    result: dict[str, Any] | None,
    error_detail: str | None = None,
) -> None:
    """Appelé une fois par requête /predict (succès ou erreur HTTP gérée)."""
    _apply_simulation_flags()
    latency_ms = latency_seconds * 1000.0

    m.PREDICT_REQUESTS.labels(task=task, status=str(status_code)).inc()
    m.PREDICT_LATENCY.labels(task=task).observe(latency_seconds)

    if status_code >= 400:
        m.API_ERRORS.labels(code=str(status_code)).inc()
        if status_code >= 500:
            LOG.error(
                "predict_server_error task=%s status=%s detail=%s",
                task,
                status_code,
                error_detail or "",
                extra={"event": "api_error", "task": task},
            )
        else:
            LOG.warning(
                "predict_client_error task=%s status=%s",
                task,
                status_code,
                extra={"event": "api_error", "task": task},
            )
        return

    miss = _payload_missing_ratio(task, payload)
    m.DATA_MISSING_RATIO.labels(task=task).set(miss)
    fresh = _freshness_seconds(task, payload)
    m.DATA_FRESHNESS_SECONDS.labels(task=task).set(fresh)

    max_conf = 0.0
    if task == "strategic_recommendations" and result:
        bd = result.get("confidence_breakdown") or {}
        if bd:
            max_conf = max(float(v) for v in bd.values())
            m.MODEL_CONFIDENCE.labels(task=task).set(max_conf)
            _recent_max_conf.append(max_conf)

    ratio = _rolling_accuracy_proxy()
    m.ACCURACY_RATIO_VS_BASELINE.set(ratio)
    m.MODEL_HEALTH_SCORE.set(min(1.0, ratio))

    reasons: list[str] = []

    if latency_ms > BASELINE_LATENCY_MS:
        reasons.append("high_latency")
        m.DRIFT_EVENTS.labels(type="latency").inc()
        LOG.warning(
            "anomaly_high_latency task=%s latency_ms=%.1f baseline_ms=%.1f",
            task,
            latency_ms,
            BASELINE_LATENCY_MS,
            extra={"event": "anomaly", "kind": "latency"},
        )

    if miss >= MISSING_DATA_ALERT:
        reasons.append("missing_features")
        m.DRIFT_EVENTS.labels(type="data_quality").inc()
        LOG.warning(
            "anomaly_missing_features task=%s ratio=%.2f",
            task,
            miss,
            extra={"event": "anomaly", "kind": "data_quality"},
        )

    if fresh > float(os.environ.get("SCOUT_STALE_DATA_SECONDS", "86400")) and fresh >= 0:
        reasons.append("stale_data")
        m.DRIFT_EVENTS.labels(type="data_freshness").inc()
        LOG.warning(
            "anomaly_stale_data task=%s age_s=%.0f",
            task,
            fresh,
            extra={"event": "anomaly", "kind": "freshness"},
        )

    if task == "strategic_recommendations" and max_conf > 0:
        threshold = BASELINE_CONFIDENCE_PCT * (1.0 - CONFIDENCE_DROP_PCT / 100.0)
        if max_conf < threshold:
            reasons.append("confidence_drop")
            m.DRIFT_EVENTS.labels(type="confidence").inc()
            LOG.warning(
                "drift_confidence task=%s max_conf=%.2f threshold=%.2f baseline=%.2f",
                task,
                max_conf,
                threshold,
                BASELINE_CONFIDENCE_PCT,
                extra={"event": "drift", "kind": "confidence"},
            )

    if os.environ.get("SCOUT_SIM_CONFIDENCE", "") == "1":
        reasons.append("simulated_confidence")
        m.DRIFT_EVENTS.labels(type="confidence").inc()
        LOG.warning("simulation_scenario confidence_drop (SCOUT_SIM_CONFIDENCE=1)", extra={"event": "simulation"})

    if os.environ.get("SCOUT_SIM_ACCURACY", "") == "1":
        reasons.append("simulated_accuracy")
        m.DRIFT_EVENTS.labels(type="accuracy").inc()
        m.ACCURACY_RATIO_VS_BASELINE.set(max(0.5, BASELINE_ACCURACY_RATIO - 0.08))
        LOG.warning("simulation_scenario accuracy_degradation (SCOUT_SIM_ACCURACY=1)", extra={"event": "simulation"})

    if ratio < (BASELINE_ACCURACY_RATIO - 0.05) and task == "strategic_recommendations" and len(_recent_max_conf) >= 5:
        reasons.append("accuracy_proxy_drop")
        m.DRIFT_EVENTS.labels(type="accuracy").inc()
        LOG.warning(
            "drift_accuracy_proxy ratio=%.3f baseline=%.3f",
            ratio,
            BASELINE_ACCURACY_RATIO,
            extra={"event": "drift", "kind": "accuracy"},
        )

    for label in ("high_latency", "missing_features", "stale_data", "confidence_drop", "accuracy_proxy_drop"):
        m.DRIFT_ACTIVE.labels(reason=label).set(1 if label in reasons else 0)

    retrain_reasons = [r for r in reasons if r in ("confidence_drop", "accuracy_proxy_drop", "missing_features")]
    if retrain_reasons:
        for r in retrain_reasons:
            m.RETRAINING_TRIGGERS.labels(reason=r).inc()
        LOG.error(
            "retraining_trigger reasons=%s metrics=drift_detection",
            ",".join(retrain_reasons),
            extra={"event": "retraining_trigger", "reasons": retrain_reasons},
        )
