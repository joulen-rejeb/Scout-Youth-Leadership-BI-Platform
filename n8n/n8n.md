# 🏕️ Scout Group — Automated ML Pipeline

## Description
Pipeline ML automatisé avec n8n connecté à SQL Server (SCOUTS_DW).
Objectif : analyser les données Scouts via 4 modèles ML et envoyer
un rapport automatique par email chaque jour.

---

## Architecture
Schedule Trigger (8h) ──┐
├──→ Read SA → If(Validation)
Webhook (manuel) ────────┘
↓ TRUE
OBJ1 - Track Members (ARIMA + LR)
↓
OBJ2 - Communication (KMeans)
↓
OBJ3 - Budget (RandomForest)
↓
Retrain 3 modèles
↓
Gmail Succes
↓ FALSE
Gmail Erreur SA
---

## Fichiers du projet

| Fichier | Role |
|---|---|
| app.py | Serveur Flask - pont entre n8n et Python |
| obj1_track_members.py | ARIMA + Logistic Regression |
| obj2_communication.py | KMeans Clustering TikTok |
| obj3_budget.py | RandomForest Regressor Budget |
| retrain.py | Retraining automatique 3 modeles |
| My_workflow.json | Export workflow n8n |
| pipeline.log | Logs automatiques |
| README.md | Documentation projet |

---

## Modeles ML

| Modele | Algorithme | Table DW | Objectif |
|---|---|---|---|
| arima_model.pkl | ARIMA | ETL_Fact_Members | Forecast membres |
| classification_lr.pkl | Logistic Regression | ETL_Fact_Members | Dropout prediction |
| kmeans_model.pkl | KMeans K=2 | ETL_Fact_Com | Normal vs Viral |
| regression_rf.pkl | RandomForest | ETL_Fact_Budgets | Budget estimation |

---

## n8n Nodes utilises

| Noeud | Role |
|---|---|
| Schedule Trigger | Cron automatique chaque jour 8h |
| Webhook | Declenchement manuel via URL HTTP |
| Execute Query | Verifie que SCOUT_SA a des donnees |
| If Validation | Branche true/false selon total_records |
| HTTP Request OBJ1 | Appelle /run-obj1 sur Flask |
| HTTP Request OBJ2 | Appelle /run-obj2 sur Flask |
| HTTP Request OBJ3 | Appelle /run-obj3 sur Flask |
| HTTP Request Retrain | Appelle /retrain sur Flask |
| Send Email Succes | Gmail rapport succes |
| Send Email Erreur | Gmail alerte erreur SA |

---

## Design Decisions

### Pourquoi Flask ?
n8n ne peut pas appeler directement un fichier .py.
Flask cree des URLs HTTP que n8n peut appeler via HTTP Request.

### Pourquoi 3 scripts separes ?
Un script par objectif = modulaire et facile a maintenir.
Chaque objectif peut etre execute independamment.

### Pourquoi Retrain avant Gmail ?
Pour que l email de succes confirme que TOUT est termine
incluant le retraining des modeles.

### Pourquoi Schedule + Webhook ?
- Schedule : execution automatique quotidienne sans intervention
- Webhook : declenchement manuel en cas de besoin urgent

### Pourquoi 3 tables DW differentes ?
- ETL_Fact_Members : donnees membres et unites
- ETL_Fact_Com : donnees TikTok et medias
- ETL_Fact_Budgets : donnees budget et camps

---

## Installation

```cmd
pip install pyodbc pandas scikit-learn flask requests joblib statsmodels
```

---

## Lancement

```cmd
cd C:\PA
python app.py
```

---

## Test des routes Flask

```cmd
curl http://127.0.0.1:5000/run-obj1
curl http://127.0.0.1:5000/run-obj2
curl http://127.0.0.1:5000/run-obj3
curl http://127.0.0.1:5000/retrain
```

---

## Resultats obtenus

| Objectif | Resultat |
|---|---|
| OBJ1 Track Members | 1052 membres, 9 unites a risque, forecast 130 |
| OBJ2 Communication | 61 posts TikTok, segments Normal/Viral |
| OBJ3 Budget | 25 lignes, budget total estime 46.98 |
| Retraining | 3 modeles mis a jour automatiquement |

---

## Logs

Les logs sont sauvegardes automatiquement dans :
C:\PA\pipeline.log

Format : date - niveau - message

---

*Projet realise par Joulen REJEB — Esprit School 2026*