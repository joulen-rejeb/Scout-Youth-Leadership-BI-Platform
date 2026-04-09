# MLOps — livrables S12 (équipe technique)

Ce document s’adresse aux **techniciens** (enseignants, ops). Les **clients** utilisent uniquement l’application web ; **aucun lien MLflow n’y figure**.

## Lien MLflow (UI)

- **Local** (après `npm run mlflow-ui`) : [http://127.0.0.1:5001](http://127.0.0.1:5001)
- **Docker Compose** : [http://localhost:5001](http://localhost:5001)

Magasin de tracking : dossier `mlops/mlruns/` (runs, métriques, artefacts, model registry fichier).

## Console web technique (mlruns + registry + métriques pipeline)

**Non listée dans l’UI** : aucun bouton ni entrée de menu ne pointe vers cette page (usage équipe / enseignants uniquement). La page est **autonome** (pas de barre latérale workspace, aucun lien de retour vers l’app).

- **Chemin canonique** : `/ops/mlflow`
- **Exemple** (adapter host et port affichés par `npm run dev`) : `http://localhost:8080/ops/mlflow`

Contenu : expériences MLflow, chaque run avec les métriques du pipeline (`test_mae`, `test_rmse`, `test_r2`) mises en évidence, autres métriques, paramètres, et tableau **model registry** (versions, stages, `run_id`, source).

## Commande — exécuter le pipeline d’entraînement

À lancer depuis le dossier **`scouts-vision-studio`** :

```bash
python -m ml_backend.pipeline.train_pipeline
```

Équivalent npm :

```bash
npm run ml-train
```

Le pipeline enchaîne **prétraitement → entraînement → évaluation → sauvegarde** (meilleur run → `budget_rf.pkl` à la racine du projet) et enregistre **deux runs comparables** dans MLflow + **deux versions** du modèle `scouts_budget_rf_pipeline` dans le registry.

## Critères de validation (rappel)

| Critère | Réalisation |
|--------|-------------|
| Experiment tracking (MLflow) | Paramètres, métriques, artefacts (`budget_rf_model`, rapports JSON) ; **2 runs** dans l’expérience `scouts_training_pipeline` |
| Pipeline automatisé | `ml_backend/pipeline/train_pipeline.py`, reproductible (graines loguées) |
| Model management | `mlflow.register_model` ; versions successives consultables dans MLflow UI |
| API FastAPI | `POST /predict`, `GET /health`, `GET /` ; doc `/docs` |
| Docker | `Dockerfile` + `docker compose up` |
| Intégration web | L’app appelle l’API de prédiction (HTTP) ; **pas** de test API ni de lien MLflow dans l’UI |

## Docker

```bash
docker compose up --build
```

Exécuter le pipeline **sur l’hôte** (même dépôt monté dans les conteneurs) pour mettre à jour `mlops/mlruns` et les `.pkl`, puis redémarrer `ml-api` si les modèles sont chargés au démarrage du processus Python.

## Semaine S13 — monitoring (Prometheus / Grafana)

- **Métriques HTTP + métier** : `GET /metrics` sur l’API ML (`scout_*`, histogrammes de latence `/predict`, dérive, qualité des payloads).
- **Prometheus + Grafana** : `docker compose up` dans `scouts-vision-studio` → Prometheus http://localhost:9090 , Grafana http://localhost:3000 (admin/admin). Dashboard provisionné : *Scouts Vision*.
- **Sans Docker (Windows)** : `npm run prometheus:download-win` puis `npm run grafana:download-win` ; lancer `ml-api`, `npm run prometheus`, `npm run grafana` ; provisioning Grafana « natif » : `monitoring/grafana/provisioning-native/` (datasource http://127.0.0.1:9090). Voir `README.txt`.
- **Règles d’alerte** : `monitoring/alerts.yml` (latence, erreurs, dérive confiance/précision proxy, données manquantes, 5xx).
- **Simulation** : `npm run monitor:simulate-traffic|errors|drift` ; variables `SCOUT_SIM_*` documentées dans le `README.txt` à la racine du dépôt.
- **Code** : `ml_backend/monitoring/` (métriques, seuils de dérive, logs `scout.monitoring`).
