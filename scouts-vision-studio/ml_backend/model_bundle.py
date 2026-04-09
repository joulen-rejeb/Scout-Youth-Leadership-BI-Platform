"""Load production models from .pkl at repository root."""
from __future__ import annotations

import joblib

from ml_backend.paths import ROOT

_MODEL_PATHS = {
    "arima": ROOT / "arima_model.pkl",
    "kmeans": ROOT / "kmeans_model.pkl",
    "classification_lr": ROOT / "classification_lr.pkl",
    "regression_rf": ROOT / "budget_rf.pkl",
}


def load_models():
    missing = [p.name for p in _MODEL_PATHS.values() if not p.is_file()]
    if missing:
        return None, (
            f"Fichiers .pkl manquants dans {ROOT}: {', '.join(sorted(set(missing)))}. "
            "Exécutez le pipeline d’entraînement ou copiez les modèles à la racine du projet."
        )
    return (
        {
            "arima": joblib.load(_MODEL_PATHS["arima"]),
            "kmeans": joblib.load(_MODEL_PATHS["kmeans"]),
            "classification_lr": joblib.load(_MODEL_PATHS["classification_lr"]),
            "regression_rf": joblib.load(_MODEL_PATHS["regression_rf"]),
        },
        None,
    )


_models, _models_error = load_models()
