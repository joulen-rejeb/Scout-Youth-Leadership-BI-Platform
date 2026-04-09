"""FastAPI ML service: /, /health, /predict, /mlops/overview, /metrics (Prometheus)."""
from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from enum import Enum
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter
from starlette.responses import Response

from ml_backend import model_bundle
from ml_backend.openapi_schemas import (
    HealthResponse,
    HttpServiceUrls,
    PredictResponseSchema,
    RootInfoResponse,
)
from ml_backend.mlflow_util import build_mlops_overview, configure_tracking, maybe_log_prediction
from ml_backend.paths import MLFLOW_FILE_STORE, MLOPS_ROOT
from ml_backend.monitoring.drift import observe_predict_outcome
from ml_backend.monitoring.metrics import metrics_http_response, setup_prometheus_instrumentation
from ml_backend.predict_service import (
    run_membership_forecast,
    run_operational_outlook,
    run_participation_trends,
    run_strategic_recommendations,
)

MLFLOW_UI_DEFAULT = os.environ.get("SCOUT_MLFLOW_UI_URL", "http://127.0.0.1:5001")

_predict_response_adapter: TypeAdapter[PredictResponseSchema] = TypeAdapter(PredictResponseSchema)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logging.basicConfig(
        level=os.environ.get("SCOUT_LOG_LEVEL", "INFO"),
        format="%(asctime)s [%(levelname)s] %(name)s %(message)s",
    )
    configure_tracking()
    yield


app = FastAPI(
    title="API ML — Scouts Vision",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters={
        "tryItOutEnabled": True,
        "displayRequestDuration": True,
        "docExpansion": "list",
        "filter": True,
        "persistAuthorization": True,
        "syntaxHighlight.theme": "agate",
    },
    openapi_tags=[
        {"name": "accueil"},
        {"name": "sante"},
        {"name": "predictions"},
        {"name": "mlops"},
        {"name": "monitoring", "description": "Prometheus /metrics (S13)."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_prometheus_instrumentation(app)


@app.get(
    "/metrics",
    tags=["monitoring"],
    summary="Métriques Prometheus",
    description=(
        "Exposition OpenMetrics pour le scrape Prometheus (compteurs HTTP, histogrammes de latence, "
        "métriques métier `scout_*`). Réponse `text/plain` ; utiliser « Try it out » pour prévisualiser."
    ),
    responses={
        200: {
            "description": "Série temporelle au format exposition Prometheus.",
            "content": {
                "text/plain": {
                    "example": "# HELP scout_predict_requests_total ...\n# TYPE scout_predict_requests_total counter\n",
                }
            },
        }
    },
)
def prometheus_metrics() -> Response:
    return metrics_http_response()


class PredictTask(str, Enum):
    """Tâches supportées par `POST /predict`."""

    membership_forecast = "membership_forecast"
    participation_trends = "participation_trends"
    operational_outlook = "operational_outlook"
    strategic_recommendations = "strategic_recommendations"


class PredictRequest(BaseModel):
    """Corps de la requête pour `POST /predict`."""

    task: PredictTask = Field(
        ...,
        description="Type de prédiction.",
        json_schema_extra={"example": "operational_outlook"},
    )
    payload: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Entrées selon la tâche. Ex. `operational_outlook` : season, flowtype, "
            "budget_sub_category, budget_month, participants, duration_days."
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"task": "membership_forecast", "payload": {}},
                {
                    "task": "operational_outlook",
                    "payload": {
                        "season": 2024,
                        "flowtype": 1,
                        "budget_sub_category": 1,
                        "budget_month": 6,
                        "participants": 30,
                        "duration_days": 3,
                    },
                },
                {
                    "task": "participation_trends",
                    "payload": {
                        "views": 1200,
                        "likes": 180,
                        "comments": 42,
                        "engagement_rate": 12,
                        "visibility_index": 55,
                    },
                },
                {
                    "task": "strategic_recommendations",
                    "payload": {
                        "members_count": 30,
                        "leaders_count": 3,
                        "leaders_to_members_ratio": 0.1,
                        "activities_per_member": 2,
                        "female_ratio": 0.4,
                        "activity_count": 10,
                    },
                },
            ]
        }
    )


def _models_or_raise():
    if model_bundle._models is None:
        raise HTTPException(status_code=503, detail=model_bundle._models_error or "Models unavailable")
    return model_bundle._models


def _public_api_base(request: Request) -> str:
    env = os.environ.get("SCOUT_ML_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if env:
        return env
    return str(request.base_url).rstrip("/")


@app.get(
    "/",
    tags=["accueil"],
    summary="Informations sur le service",
    response_model=RootInfoResponse,
)
def root(request: Request) -> RootInfoResponse:
    base = _public_api_base(request)
    return RootInfoResponse(
        service="Scouts Vision ML API",
        endpoints={
            "health": {"method": "GET", "path": "/health"},
            "predict": {"method": "POST", "path": "/predict"},
            "metrics": {"method": "GET", "path": "/metrics"},
            "mlops_overview": {"method": "GET", "path": "/mlops/overview"},
        },
        mlflow_ui_technique=MLFLOW_UI_DEFAULT,
        http=HttpServiceUrls(
            api_base=base,
            openapi_json=f"{base}/openapi.json",
            swagger_ui=f"{base}/docs",
            redoc=f"{base}/redoc",
            health=f"{base}/health",
            predict=f"{base}/predict",
            metrics=f"{base}/metrics",
            mlops_overview=f"{base}/mlops/overview",
            mlflow_ui=MLFLOW_UI_DEFAULT,
        ),
    )


@app.get(
    "/health",
    tags=["sante"],
    summary="Santé de l’API et des modèles",
    description="Indique si les fichiers `.pkl` sont chargés et résume le magasin MLflow local.",
    response_description="Statut ok, chemins mlops, compteur d’expériences MLflow.",
    response_model=HealthResponse,
)
def health() -> HealthResponse:
    configure_tracking()
    n_experiments = 0
    try:
        from mlflow.tracking import MlflowClient

        n_experiments = len(MlflowClient().search_experiments())
    except Exception:
        pass
    return HealthResponse(
        ok=True,
        root=str(model_bundle.ROOT),
        models_ready=model_bundle._models is not None,
        models_error=model_bundle._models_error,
        mlflow_tracking_uri=os.environ.get("MLFLOW_TRACKING_URI")
        or MLFLOW_FILE_STORE.resolve().as_uri(),
        mlops_root=str(MLOPS_ROOT.resolve()),
        mlruns_path=str(MLFLOW_FILE_STORE.resolve()),
        mlflow_experiments_count=n_experiments,
        mlflow_ui_hint=MLFLOW_UI_DEFAULT,
    )


@app.post(
    "/predict",
    tags=["predictions"],
    summary="Exécuter une prédiction",
    response_description="Réponse JSON selon la tâche (voir schémas MembershipForecastResponse, etc.).",
    response_model=PredictResponseSchema,
    responses={
        503: {"description": "Fichiers modèle manquants à la racine du projet."},
        422: {"description": "Corps invalide (ex. `task` inconnu)."},
        500: {"description": "Erreur interne pendant l’inférence."},
    },
)
def predict(body: PredictRequest) -> PredictResponseSchema:
    t0 = time.perf_counter()
    task = body.task.value
    data = body.payload
    try:
        sim_ms = os.environ.get("SCOUT_SIM_LATENCY_MS", "").strip()
        if sim_ms:
            time.sleep(min(5.0, float(sim_ms) / 1000.0))
        models = _models_or_raise()
        if body.task is PredictTask.membership_forecast:
            result = run_membership_forecast(models, data)
        elif body.task is PredictTask.participation_trends:
            result = run_participation_trends(models, data)
        elif body.task is PredictTask.operational_outlook:
            result = run_operational_outlook(models, data)
        else:
            result = run_strategic_recommendations(models, data)
        maybe_log_prediction(task, data, result)
        validated = _predict_response_adapter.validate_python(result)
    except HTTPException as e:
        observe_predict_outcome(
            task=task,
            status_code=e.status_code,
            latency_seconds=time.perf_counter() - t0,
            payload=data,
            result=None,
            error_detail=str(e.detail) if e.detail is not None else None,
        )
        raise
    except Exception as e:
        observe_predict_outcome(
            task=task,
            status_code=500,
            latency_seconds=time.perf_counter() - t0,
            payload=data,
            result=None,
            error_detail=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e)) from e

    observe_predict_outcome(
        task=task,
        status_code=200,
        latency_seconds=time.perf_counter() - t0,
        payload=data,
        result=result,
    )
    return validated


@app.get(
    "/mlops/overview",
    tags=["mlops"],
    summary="Aperçu MLflow (technique)",
    response_description="Expériences, runs, métriques, model registry.",
)
def mlops_overview():
    try:
        return build_mlops_overview()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"MLflow indisponible ou magasin vide: {e}. Lancez le pipeline (npm run ml-train) et npm run mlflow-ui.",
        ) from e


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("SCOUT_ML_PORT", "5050"))
    host = os.environ.get("SCOUT_ML_HOST", "127.0.0.1")
    reload = os.environ.get("SCOUT_ML_RELOAD", "1") == "1"
    uvicorn.run("ml_backend.main:app", host=host, port=port, reload=reload)
