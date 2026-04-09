"""
Pipeline d'entraînement automatisé (S12 MLOps) — bout-en-bout, reproductible.

Étapes : jeu de données (synthétique, même schéma 8 features que l’API) → prétraitement
(StandardScaler dans un Pipeline sklearn) → entraînement (RandomForest) → évaluation
(MAE, RMSE, R² sur hold-out) → sauvegarde du meilleur modèle en `budget_rf.pkl` →
traçage MLflow (paramètres, métriques, artefact modèle) + enregistrement Model Registry.

Deux runs distincts sont produits pour comparaison dans MLflow (hyperparamètres / split différents).

Exécution (répertoire `scouts-vision-studio`) :

  python -m ml_backend.pipeline.train_pipeline

ou : npm run ml-train
"""
from __future__ import annotations

import json

import joblib
import mlflow
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ml_backend.mlflow_util import configure_tracking, tracking_uri
from ml_backend.paths import MLOPS_ROOT, ROOT

EXPERIMENT = "scouts_training_pipeline"
REGISTRY_NAME = "scouts_budget_rf_pipeline"
N_SAMPLES = 800


def _rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def build_training_matrix(n_samples: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """Génère X (8 colonnes, ordre identique à `predict_service.run_operational_outlook`) et y (cible régression)."""
    rng = np.random.default_rng(seed)
    season = rng.choice([2023.0, 2024.0, 2025.0, 2026.0], size=n_samples)
    flowtype = rng.choice([1.0, 2.0], size=n_samples)
    subcat = rng.integers(1, 6, size=n_samples).astype(float)
    budget_month = rng.integers(1, 13, size=n_samples).astype(float)
    participants = rng.uniform(15.0, 80.0, size=n_samples)
    duration = rng.uniform(1.0, 10.0, size=n_samples)
    X = np.column_stack(
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
    ).astype(np.float64)
    noise = rng.normal(0.0, 0.12, size=n_samples)
    y = (
        4.0
        + 0.0008 * (season - 2020.0)
        + 0.025 * (flowtype - 1.5)
        - 0.04 * subcat
        + 0.012 * budget_month
        - 0.006 * participants
        + 0.07 * duration
        + noise
    ).astype(np.float64)
    return X, y


def run_training_run(
    run_name: str,
    *,
    n_estimators: int,
    max_depth: int | None,
    min_samples_leaf: int,
    data_seed: int,
    split_seed: int,
    test_size: float = 0.25,
) -> dict:
    with mlflow.start_run(run_name=run_name):
        mlflow.log_param("tracking_uri", tracking_uri())
        mlflow.log_params(
            {
                "n_estimators": n_estimators,
                "max_depth": max_depth if max_depth is not None else "null",
                "min_samples_leaf": min_samples_leaf,
                "data_seed": data_seed,
                "split_seed": split_seed,
                "test_size": test_size,
                "n_samples": N_SAMPLES,
                "preprocessing": "StandardScaler",
                "estimator": "RandomForestRegressor",
            }
        )

        X, y = build_training_matrix(N_SAMPLES, data_seed)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=split_seed
        )

        model = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "rf",
                    RandomForestRegressor(
                        n_estimators=n_estimators,
                        max_depth=max_depth,
                        min_samples_leaf=min_samples_leaf,
                        random_state=split_seed,
                        n_jobs=-1,
                    ),
                ),
            ]
        )
        model.fit(X_train, y_train)
        pred = model.predict(X_test)

        mae = mean_absolute_error(y_test, pred)
        rmse = _rmse(y_test, pred)
        r2 = r2_score(y_test, pred)
        mlflow.log_metrics({"test_mae": mae, "test_rmse": rmse, "test_r2": r2})

        mlflow.sklearn.log_model(model, artifact_path="budget_rf_model")
        run_id = mlflow.active_run().info.run_id
        model_uri = f"runs:/{run_id}/budget_rf_model"
        mv = mlflow.register_model(model_uri=model_uri, name=REGISTRY_NAME)

        eval_report = {
            "run_name": run_name,
            "run_id": run_id,
            "metrics": {"test_mae": mae, "test_rmse": rmse, "test_r2": r2},
            "registry": REGISTRY_NAME,
            "model_version": mv.version,
        }
        report_path = MLOPS_ROOT / f"eval_{run_name}.json"
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(eval_report, indent=2), encoding="utf-8")
        mlflow.log_artifact(str(report_path), artifact_path="evaluation_reports")

        return {"model": model, "r2": float(r2), "run_id": run_id, "report": eval_report}


def run_eval_pkl_models_metrics() -> None:
    """
    Run unique : métriques d’évaluation associées aux .pkl déjà présents (hors ré-entraînement RF).
    Noms de métriques alignés avec la console /ops/mlflow.
    """
    metrics: dict[str, float] = {}
    params: dict[str, str] = {}

    kp = ROOT / "kmeans_model.pkl"
    if kp.is_file():
        try:
            km = joblib.load(kp)
            if hasattr(km, "inertia_") and km.inertia_ is not None:
                metrics["eval_kmeans_inertia"] = float(km.inertia_)
            rng = np.random.default_rng(7)
            n = 400
            Xk = np.column_stack(
                [
                    rng.uniform(0, 5000, n),
                    rng.uniform(0, 500, n),
                    rng.uniform(0, 200, n),
                    rng.uniform(0, 25, n),
                    rng.uniform(0, 100, n),
                ]
            ).astype(np.float64)
            labels = km.predict(Xk)
            if len(np.unique(labels)) > 1:
                metrics["eval_kmeans_silhouette"] = float(silhouette_score(Xk, labels))
            params["eval_kmeans_status"] = "ok"
        except Exception as e:
            params["eval_kmeans_status"] = str(e)[:200]

    lp = ROOT / "classification_lr.pkl"
    if lp.is_file():
        try:
            clf = joblib.load(lp)
            rng = np.random.default_rng(11)
            n = 500
            Xl = np.column_stack(
                [
                    rng.uniform(10, 100, n),
                    rng.uniform(1, 15, n),
                    rng.uniform(0.02, 0.35, n),
                    rng.uniform(0.5, 5, n),
                    rng.uniform(0.15, 0.65, n),
                    rng.uniform(3, 40, n),
                ]
            ).astype(np.float64)
            proba = clf.predict_proba(Xl)
            metrics["eval_strategic_lr_mean_max_proba"] = float(np.mean(np.max(proba, axis=1)))
            params["eval_strategic_lr_status"] = "ok"
        except Exception as e:
            params["eval_strategic_lr_status"] = str(e)[:200]

    ap = ROOT / "arima_model.pkl"
    if ap.is_file():
        try:
            arima = joblib.load(ap)
            for name, attr in (("eval_arima_aic", "aic"), ("eval_arima_bic", "bic")):
                v = getattr(arima, attr, None)
                if v is None and hasattr(arima, "model_"):
                    v = getattr(arima.model_, attr, None)
                if v is not None and np.isfinite(v):
                    metrics[name] = float(v)
            params["eval_arima_status"] = "ok"
        except Exception as e:
            params["eval_arima_status"] = str(e)[:200]

    if not metrics and not params:
        return

    with mlflow.start_run(run_name="run_metrics_eval_pkl_models"):
        mlflow.log_params({**params, "eval_note": "Métriques sur .pkl existants — voir doc pipeline."})
        if metrics:
            mlflow.log_metrics(metrics)


def main() -> None:
    configure_tracking()
    mlflow.set_experiment(EXPERIMENT)

    # Run 1 — forêt plus profonde, plus d’arbres
    out_a = run_training_run(
        "run_a_deep_forest",
        n_estimators=140,
        max_depth=14,
        min_samples_leaf=1,
        data_seed=42,
        split_seed=42,
    )
    # Run 2 — régularisation plus forte + autre split (comparable dans MLflow)
    out_b = run_training_run(
        "run_b_regularized",
        n_estimators=70,
        max_depth=6,
        min_samples_leaf=4,
        data_seed=42,
        split_seed=99,
    )

    best = out_a if out_a["r2"] >= out_b["r2"] else out_b
    joblib.dump(best["model"], ROOT / "budget_rf.pkl")

    summary = {
        "experiment": EXPERIMENT,
        "registry_name": REGISTRY_NAME,
        "best_run_id": best["run_id"],
        "best_r2": best["r2"],
        "runs_compared": [out_a["report"], out_b["report"]],
        "production_pkl": str((ROOT / "budget_rf.pkl").resolve()),
    }
    summary_path = MLOPS_ROOT / "last_pipeline_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    run_eval_pkl_models_metrics()


if __name__ == "__main__":
    main()
