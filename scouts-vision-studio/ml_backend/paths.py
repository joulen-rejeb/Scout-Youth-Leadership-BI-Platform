from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Dossier MLOps : runs, artefacts et model registry (backend fichier MLflow)
MLOPS_ROOT = ROOT / "mlops"
MLFLOW_FILE_STORE = MLOPS_ROOT / "mlruns"
