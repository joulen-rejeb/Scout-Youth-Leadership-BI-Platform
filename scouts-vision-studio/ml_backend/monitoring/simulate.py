"""
Scénarios de simulation S13 (charge, erreurs, charge utile extrême pour confiance).

Usage (depuis scouts-vision-studio) :
  python -m ml_backend.monitoring.simulate --base http://127.0.0.1:5050 --scenario traffic
  python -m ml_backend.monitoring.simulate --base http://127.0.0.1:5050 --scenario errors
  python -m ml_backend.monitoring.simulate --base http://127.0.0.1:5050 --scenario drift

Voir README (section S13) pour SCOUT_SIM_* côté serveur.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import sys
import urllib.error
import urllib.request


def _post(base: str, body: dict) -> tuple[int, str]:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{base.rstrip('/')}/predict",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def scenario_traffic(base: str, n: int) -> None:
    body = {
        "task": "operational_outlook",
        "payload": {
            "season": 2024,
            "flowtype": 1,
            "budget_sub_category": 1,
            "budget_month": 6,
            "participants": 30,
            "duration_days": 3,
        },
    }

    def one(_: int) -> None:
        _post(base, body)

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as ex:
        list(ex.map(one, range(n)))
    print(f"traffic: {n} requêtes /predict (operational_outlook) envoyées.")


def scenario_errors(base: str, n: int) -> None:
    bad_bodies = [
        {"task": "operational_outlook", "payload": "not-an-object"},
        {"task": "unknown_task", "payload": {}},
        {},
    ]
    for i in range(n):
        b = bad_bodies[i % len(bad_bodies)]
        code, _ = _post(base, b)
        print(f"errors sample {i}: HTTP {code}")
    print("errors: requêtes invalides envoyées (observez scout_api_predict_errors_total et logs).")


def scenario_drift(base: str, n: int) -> None:
    """Charge stratégique avec valeurs extrêmes pour tendre vers une confiance plus faible."""
    body_template = {
        "task": "strategic_recommendations",
        "payload": {
            "members_count": 2,
            "leaders_count": 1,
            "leaders_to_members_ratio": 0.5,
            "activities_per_member": 0.1,
            "female_ratio": 0.01,
            "activity_count": 0,
        },
    }
    for i in range(n):
        b = dict(body_template)
        b["payload"] = dict(body_template["payload"])
        b["payload"]["members_count"] = max(1, 5 + (i % 3))
        code, _ = _post(base, b)
        if i % 10 == 0:
            print(f"drift batch {i}: HTTP {code}")
    print("drift: série strategic_recommendations envoyée (métriques confiance / dérive).")


def main() -> None:
    p = argparse.ArgumentParser(description="Simulation monitoring S13")
    p.add_argument("--base", default="http://127.0.0.1:5050", help="URL de l’API ML")
    p.add_argument("--scenario", choices=("traffic", "errors", "drift"), required=True)
    p.add_argument("--count", type=int, default=120, help="Nombre de requêtes (traffic/drift)")
    args = p.parse_args()
    if args.scenario == "traffic":
        scenario_traffic(args.base, args.count)
    elif args.scenario == "errors":
        scenario_errors(args.base, min(args.count, 40))
    else:
        scenario_drift(args.base, args.count)


if __name__ == "__main__":
    main()
    sys.exit(0)
