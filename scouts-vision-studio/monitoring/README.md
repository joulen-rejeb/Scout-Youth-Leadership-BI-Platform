# Monitoring S13 — Prometheus & Grafana dans le projet

Ce dossier regroupe **toute la configuration** (fichiers « code ») pour Prometheus et Grafana. Les binaires téléchargés localement ne sont **pas** versionnés (voir `.gitignore`).

## Intervalle de scrape Prometheus

| Fichier | Rôle | `scrape_interval` |
|--------|------|-------------------|
| `prometheus.yml` | Docker Compose (`ml-api:5050`) | **15 s** |
| `prometheus.native.yml` | Exécution native (`127.0.0.1:5050`, `npm run prometheus`) | **15 s** |
| `prometheus.host.yml` | Prometheus en conteneur, API sur l’hôte (`host.docker.internal:5050`) | **15 s** |

L’API expose les métriques sur `GET /metrics`. Le **code applicatif** (compteurs `scout_*`, dérive, instrumentation FastAPI) est dans le dépôt ici :

- `../ml_backend/monitoring/metrics.py` — définition des métriques + `setup_prometheus_instrumentation`
- `../ml_backend/monitoring/drift.py` — seuils et logs d’observabilité
- `../ml_backend/monitoring/simulate.py` — scénarios de charge (CLI)
- `../ml_backend/main.py` — route `GET /metrics`, enregistrement après chaque `POST /predict`

---

## Arborescence

```
monitoring/
├── README.md                    ← ce fichier
├── alerts.yml                   ← règles d’alerte Prometheus (latence, erreurs, dérive…)
├── prometheus.yml               ← config Prometheus pour docker compose
├── prometheus.native.yml        ← config Prometheus sans Docker (scrape local)
├── prometheus.host.yml          ← Prometheus Docker → API sur l’hôte Windows
├── start-prometheus-windows.cmd ← lance prometheus.exe (PATH ou dossier monitoring/)
│
├── grafana/                     ← tout ce qui concerne Grafana (fichiers versionnés)
│   ├── dashboards/
│   │   └── scouts-s13.json      ← tableau de bord « Scouts Vision »
│   ├── provisioning/            ← utilisé par Grafana **dans Docker**
│   │   ├── datasources/
│   │   │   └── prometheus.yml   → url http://prometheus:9090
│   │   └── dashboards/
│   │       └── dashboards.yml     → path /var/lib/grafana/dashboards (monté par compose)
│   └── provisioning-native/      ← utilisé par Grafana **sur l’hôte** (npm run grafana)
│       ├── datasources/
│       │   └── prometheus.yml     → url http://127.0.0.1:9090
│       └── dashboards/
│           └── default.yml        → path ../grafana/dashboards (relatif à grafana-win)
│
├── prometheus.exe               ← (local) téléchargé par npm run prometheus:download-win
└── grafana-win/                 ← (local) extrait par npm run grafana:download-win
```

Dossiers **créés au runtime** (ignorés par Git) :

- `grafana-data/` — base SQLite Grafana, logs, etc. (`npm run grafana`)
- `grafana-win/` — binaire Grafana OSS Windows

---

## Rôles rapides

| Élément | But |
|--------|-----|
| `alerts.yml` | Alertes Prometheus (fichier référencé par les `prometheus*.yml`) |
| `grafana/dashboards/*.json` | Définition des panneaux (requêtes PromQL, datasource `uid: prometheus`) |
| `grafana/provisioning/` | Datasource + chargement des dashboards **en stack Docker** |
| `grafana/provisioning-native/` | Même idée **sans Docker** : Prometheus sur `localhost:9090`, chemins adaptés à `grafana-win` |

---

## Commandes associées (depuis `scouts-vision-studio/`)

- `npm run prometheus` — Prometheus avec `monitoring/prometheus.native.yml` (scrape **15 s**)
- `npm run grafana` — Grafana avec `GF_PATHS_PROVISIONING` → `monitoring/grafana/provisioning-native`
- `docker compose up` — Prometheus + Grafana utilisent `prometheus.yml` et `grafana/provisioning/`

Pour plus de détails (installation Windows, ordre des terminaux), voir le **`README.txt`** à la racine du dépôt **ScoutsWebsite**.
