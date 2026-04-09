"""Schémas Pydantic exposés dans OpenAPI (section Schemas de /docs)."""
from __future__ import annotations

from typing import Any, Union

from pydantic import BaseModel, Field, HttpUrl


class HttpServiceUrls(BaseModel):
    """Liens HTTP du service (champs au format URI dans OpenAPI)."""

    api_base: HttpUrl = Field(description="Racine HTTP de cette API (dérivée de la requête ou de SCOUT_ML_PUBLIC_BASE_URL).")
    openapi_json: HttpUrl = Field(description="Spécification OpenAPI en JSON.")
    swagger_ui: HttpUrl = Field(description="Interface Swagger UI (/docs).")
    redoc: HttpUrl = Field(description="Documentation ReDoc (/redoc).")
    health: HttpUrl = Field(description="GET /health — état du service et des modèles.")
    predict: HttpUrl = Field(description="POST /predict — inférence (corps JSON PredictRequest).")
    metrics: HttpUrl = Field(description="GET /metrics — exposition Prometheus (OpenMetrics).")
    mlops_overview: HttpUrl = Field(description="GET /mlops/overview — aperçu MLflow (technique).")
    mlflow_ui: HttpUrl = Field(description="URL du serveur MLflow Tracking UI (ex. http://127.0.0.1:5001).")


class HealthResponse(BaseModel):
    ok: bool
    root: str
    models_ready: bool
    models_error: str | None = None
    mlflow_tracking_uri: str
    mlops_root: str
    mlruns_path: str
    mlflow_experiments_count: int
    mlflow_ui_hint: str


class RootInfoResponse(BaseModel):
    service: str
    endpoints: dict[str, Any]
    mlflow_ui_technique: str
    http: HttpServiceUrls


class MembershipForecastResponse(BaseModel):
    projected_membership: int
    historical: list[int]
    seasons: list[str]
    trajectory_summary: str
    change_pct: float


class ParticipationTrendsResponse(BaseModel):
    signal: int
    outlook_title: str
    outlook_detail: str
    guidance: str


class OperationalOutlookResponse(BaseModel):
    cost_per_person_day: float
    total_budget: float
    participants: int
    duration: int
    currency: str


class StrategicRecommendationsResponse(BaseModel):
    priority_level: int
    priority_label: str
    accent_color: str
    confidence_breakdown: dict[str, float]
    executive_guidance: str


PredictResponseSchema = Union[
    MembershipForecastResponse,
    ParticipationTrendsResponse,
    OperationalOutlookResponse,
    StrategicRecommendationsResponse,
]
