"""MLflow tracking URI and optional inference logging."""
from __future__ import annotations

import os
import time

import mlflow
from mlflow.tracking import MlflowClient

from ml_backend.paths import MLFLOW_FILE_STORE

MLRUNS_DIR = MLFLOW_FILE_STORE


def tracking_uri() -> str:
    env = os.environ.get("MLFLOW_TRACKING_URI")
    if env:
        return env
    return MLRUNS_DIR.resolve().as_uri()


def configure_tracking() -> None:
    mlflow.set_tracking_uri(tracking_uri())


def maybe_log_prediction(task: str, payload: dict, result: dict) -> None:
    if os.environ.get("SCOUT_LOG_PREDICTIONS_TO_MLFLOW") != "1":
        return
    try:
        configure_tracking()
        mlflow.set_experiment("scouts_inference")
        with mlflow.start_run(run_name=f"predict_{task}_{int(time.time())}"):
            mlflow.set_tag("task", task)
            mlflow.log_param("task", task)
            mlflow.log_metric("result_keys", float(len(result)))
    except Exception:
        pass


def get_client() -> MlflowClient:
    configure_tracking()
    return MlflowClient()


def build_mlops_overview() -> dict:
    configure_tracking()
    client = get_client()
    experiments = []
    for exp in client.search_experiments():
        runs = client.search_runs(
            experiment_ids=[exp.experiment_id],
            max_results=40,
            order_by=["attributes.start_time DESC"],
        )
        run_summaries = []
        for r in runs:
            run_summaries.append(
                {
                    "run_id": r.info.run_id,
                    "run_name": r.info.run_name or "",
                    "status": r.info.status,
                    "start_time": r.info.start_time,
                    "end_time": r.info.end_time,
                    "metrics": dict(r.data.metrics),
                    "params": dict(r.data.params),
                }
            )
        experiments.append(
            {
                "experiment_id": exp.experiment_id,
                "name": exp.name,
                "artifact_location": exp.artifact_location,
                "runs": run_summaries,
            }
        )

    registry = []
    for rm in client.search_registered_models():
        versions = []
        for mv in rm.latest_versions or []:
            versions.append(
                {
                    "version": mv.version,
                    "stage": mv.current_stage,
                    "run_id": mv.run_id,
                    "source": mv.source,
                    "status": mv.status,
                }
            )
        registry.append({"name": rm.name, "latest_versions": versions})

    return {
        "tracking_uri": mlflow.get_tracking_uri(),
        "mlops_root": str(MLFLOW_FILE_STORE.parent.resolve()),
        "mlruns_path": str(MLRUNS_DIR.resolve()),
        "experiments": experiments,
        "model_registry": registry,
    }
