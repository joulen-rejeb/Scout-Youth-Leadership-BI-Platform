/**
 * Lance Grafana OSS (Windows) avec provisioning « natif » (Prometheus sur 127.0.0.1:9090).
 *
 * Téléchargement : npm run grafana:download-win
 * Variable optionnelle : SCOUT_GRAFANA_HOME = dossier d'installation Grafana (contient bin\grafana-server.exe)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const homeDefault = path.resolve(root, "monitoring", "grafana-win");
const provisioning = path.resolve(root, "monitoring", "grafana", "provisioning-native");
const dataDir = path.resolve(root, "monitoring", "grafana-data");
const logsDir = path.resolve(dataDir, "logs");

const home = path.resolve(process.env.SCOUT_GRAFANA_HOME?.trim() || homeDefault);

/** @returns {{ exe: string; args: string[] } | null} */
function findGrafanaLaunch() {
  const bin = path.join(home, "bin");
  const legacy = path.join(bin, "grafana-server.exe");
  if (existsSync(legacy)) {
    return { exe: legacy, args: [`--homepath=${home}`] };
  }
  const unified = path.join(bin, "grafana.exe");
  if (existsSync(unified)) {
    return { exe: unified, args: ["server", `--homepath=${home}`] };
  }
  if (process.platform !== "win32") {
    const u = path.join(bin, "grafana-server");
    if (existsSync(u)) return { exe: u, args: [`--homepath=${home}`] };
  }
  return null;
}

const launch = findGrafanaLaunch();
if (!launch) {
  console.error(`Grafana introuvable sous : ${path.join(home, "bin")}`);
  console.error("Lancer : npm run grafana:download-win");
  process.exit(1);
}

if (!existsSync(provisioning)) {
  console.error("Dossier provisioning-native manquant :", provisioning);
  process.exit(1);
}

mkdirSync(dataDir, { recursive: true });
mkdirSync(logsDir, { recursive: true });

const env = {
  ...process.env,
  GF_PATHS_PROVISIONING: provisioning,
  GF_PATHS_DATA: dataDir,
  GF_PATHS_LOGS: logsDir,
  GF_SERVER_HTTP_PORT: process.env.GF_SERVER_HTTP_PORT || "3000",
  GF_SECURITY_ADMIN_USER: process.env.GF_SECURITY_ADMIN_USER || "admin",
  GF_SECURITY_ADMIN_PASSWORD: process.env.GF_SECURITY_ADMIN_PASSWORD || "admin",
  GF_USERS_DEFAULT_THEME: "dark",
  GF_AUTH_ANONYMOUS_ENABLED: "false",
};

console.log("Grafana — http://127.0.0.1:" + env.GF_SERVER_HTTP_PORT);
console.log("Compte : " + env.GF_SECURITY_ADMIN_USER + " / " + env.GF_SECURITY_ADMIN_PASSWORD);
console.log("Provisioning :", provisioning);
console.log("Données SQLite :", dataDir);
console.log("Prometheus (datasource) : http://127.0.0.1:9090 — lancer npm run prometheus\n");

const result = spawnSync(launch.exe, launch.args, {
  stdio: "inherit",
  cwd: home,
  env,
  windowsHide: false,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
