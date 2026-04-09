# Telecharge Grafana OSS (Windows amd64) dans scouts-vision-studio/monitoring/grafana-win/
#
# Usage (depuis scouts-vision-studio) :
#   powershell -ExecutionPolicy Bypass -File scripts/download-grafana-windows.ps1

$ErrorActionPreference = "Stop"
$version = "11.0.0"
$repoRoot = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $repoRoot "monitoring\grafana-win"
$zipName = "grafana-$version.windows-amd64.zip"
$url = "https://dl.grafana.com/oss/release/$zipName"
$tmp = Join-Path $env:TEMP "grafana-dl-$version"

Write-Host "Telechargement : $url"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$zipPath = Join-Path $tmp $zipName
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host "Extraction..."
if (Test-Path $dest) {
    Remove-Item -Recurse -Force $dest
}
Expand-Archive -Path $zipPath -DestinationPath $tmp -Force

$inner = Get-ChildItem -Path $tmp -Directory | Where-Object { $_.Name -like "grafana*" } | Select-Object -First 1
if (-not $inner) {
    throw "Dossier grafana* introuvable dans l'archive."
}

Move-Item -Path $inner.FullName -Destination $dest

$exeLegacy = Join-Path $dest "bin\grafana-server.exe"
$exeUnified = Join-Path $dest "bin\grafana.exe"
if (-not (Test-Path $exeLegacy) -and -not (Test-Path $exeUnified)) {
    throw "Aucun executable Grafana dans bin (grafana-server.exe ou grafana.exe)."
}

Write-Host "OK : $dest"
Write-Host ""
Write-Host "Ordre conseille :"
Write-Host "  1) npm run ml-api"
Write-Host "  2) npm run prometheus"
Write-Host "  3) npm run grafana"
Write-Host "Navigateur : http://127.0.0.1:3000  (admin / admin)"

Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
