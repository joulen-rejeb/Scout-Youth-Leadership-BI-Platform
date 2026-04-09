"""Métriques Prometheus (registre par défaut) + instrumentation HTTP FastAPI."""
from __future__ import annotations

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.responses import Response

# --- Trafic & prédictions (métier) ---
PREDICT_REQUESTS = Counter(
    "scout_predict_requests_total",
    "Nombre de requêtes POST /predict par tâche et statut HTTP.",
    ["task", "status"],
)

PREDICT_LATENCY = Histogram(
    "scout_predict_latency_seconds",
    "Latence d’inférence /predict (secondes).",
    ["task"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0),
)

# --- Santé modèle (proxy interprétable dans Grafana) ---
MODEL_CONFIDENCE = Gauge(
    "scout_model_max_confidence_percent",
    "Dernière confiance max (%) — tâche strategic_recommendations (breakdown).",
    ["task"],
)

ACCURACY_RATIO_VS_BASELINE = Gauge(
    "scout_model_accuracy_ratio_vs_baseline",
    "Ratio précision (proxy roulant) / baseline (1.0 = nominal).",
)

MODEL_HEALTH_SCORE = Gauge(
    "scout_model_health_score",
    "Score synthétique 0–1 (confiance roulante vs baseline).",
)

# --- Santé données ---
DATA_MISSING_RATIO = Gauge(
    "scout_data_missing_features_ratio",
    "Part approximative de champs manquants ou vides dans le payload.",
    ["task"],
)

DATA_FRESHNESS_SECONDS = Gauge(
    "scout_data_payload_freshness_seconds",
    "Âge du payload si `payload.observed_at` (unix s) fourni, sinon -1.",
    ["task"],
)

# --- Dérive & alertes ---
DRIFT_EVENTS = Counter(
    "scout_drift_detection_events_total",
    "Détection de dérive / dégradation (règles seuils).",
    ["type"],
)

DRIFT_ACTIVE = Gauge(
    "scout_drift_active",
    "1 si la règle indiquée est active (dernière requête / état courant).",
    ["reason"],
)

API_ERRORS = Counter(
    "scout_api_predict_errors_total",
    "Erreurs renvoyées au client sur /predict (par code HTTP).",
    ["code"],
)

RETRAINING_TRIGGERS = Counter(
    "scout_retraining_triggers_logged_total",
    "Logs « retraining recommandé » émis (observabilité).",
    ["reason"],
)

SIMULATION_ACTIVE = Gauge(
    "scout_monitoring_simulation_active",
    "1 si un scénario de simulation est actif (voir README S13).",
    ["scenario"],
)


def setup_prometheus_instrumentation(app) -> None:
    """Middleware HTTP → métriques Prometheus (registre par défaut).

    La route GET /metrics est déclarée dans main.py pour apparaître dans Swagger/OpenAPI.
    """
    Instrumentator(
        excluded_handlers=["/metrics"],
        should_group_status_codes=True,
        should_ignore_untemplated=True,
    ).instrument(app)


def metrics_http_response() -> Response:
    """Corps au format OpenMetrics / exposition Prometheus."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
