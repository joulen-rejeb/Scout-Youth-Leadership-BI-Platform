/**
 * Lance Prometheus avec monitoring/prometheus.native.yml.
 *
 * Si prometheus.exe n'est pas dans le PATH :
 *   - copiez prometheus.exe dans scouts-vision-studio/monitoring/
 *   - ou définissez le chemin complet :
 *     PowerShell: $env:SCOUT_PROMETHEUS_EXE="C:\chemin\vers\prometheus.exe"
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const configFile = path.join(root, "monitoring", "prometheus.native.yml");
const localExe = path.join(root, "monitoring", "prometheus.exe");

if (!existsSync(configFile)) {
  console.error("Fichier de config introuvable :", configFile);
  process.exit(1);
}

const args = [`--config.file=${configFile}`, "--web.listen-address=127.0.0.1:9090"];

let cmd =
  process.env.SCOUT_PROMETHEUS_EXE?.trim() ||
  process.env.PROMETHEUS_EXE?.trim() ||
  "";

if (cmd && !existsSync(cmd)) {
  console.warn("SCOUT_PROMETHEUS_EXE / PROMETHEUS_EXE pointe vers un fichier inexistant :", cmd);
  cmd = "";
}

if (!cmd && existsSync(localExe)) {
  cmd = localExe;
}

if (!cmd) {
  cmd = process.platform === "win32" ? "prometheus.exe" : "prometheus";
}

const useShell =
  process.platform === "win32" &&
  !(path.isAbsolute(cmd) && existsSync(cmd));

const result = spawnSync(cmd, args, {
  stdio: "inherit",
  cwd: root,
  shell: useShell,
  windowsHide: false,
});

if (result.error) {
  console.error(result.error.message);
}

if (result.status !== 0) {
  console.error(`
Prometheus n'a pas démarré. Le système ne trouve pas l'exécutable.

  • Option A — Copier prometheus.exe (depuis l'archive officielle) dans :
      ${path.join("scouts-vision-studio", "monitoring")}

  • Option B — Indiquer le chemin complet (PowerShell) :
      $env:SCOUT_PROMETHEUS_EXE="C:\\dossier\\prometheus.exe"
      npm run prometheus

  • Option C — Ajouter au PATH Windows le dossier qui contient prometheus.exe,
      puis fermer/réouvrir le terminal.

  Téléchargement : https://github.com/prometheus/prometheus/releases
`);
  process.exit(result.status ?? 1);
}
