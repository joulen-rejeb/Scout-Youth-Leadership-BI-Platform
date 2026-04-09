# Telecharge prometheus.exe (Windows amd64) dans scouts-vision-studio/monitoring/
#
# Usage (depuis le dossier scouts-vision-studio) :
#   powershell -ExecutionPolicy Bypass -File scripts/download-prometheus-windows.ps1

$ErrorActionPreference = "Stop"
$version = "2.52.0"
$repoRoot = Split-Path -Parent $PSScriptRoot
$monitoringDir = Join-Path $repoRoot "monitoring"
$zipName = "prometheus-$version.windows-amd64.zip"
$url = "https://github.com/prometheus/prometheus/releases/download/v$version/$zipName"
$tmp = Join-Path $env:TEMP "prometheus-download-$version"

Write-Host "Dossier monitoring : $monitoringDir"
New-Item -ItemType Directory -Force -Path $monitoringDir | Out-Null
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$zipPath = Join-Path $tmp $zipName
Write-Host "Telechargement : $url"
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host "Extraction..."
Expand-Archive -Path $zipPath -DestinationPath $tmp -Force
$exe = Get-ChildItem -Path $tmp -Recurse -Filter "prometheus.exe" | Select-Object -First 1
if (-not $exe) {
    throw "prometheus.exe introuvable dans l'archive."
}

$dest = Join-Path $monitoringDir "prometheus.exe"
Copy-Item -Path $exe.FullName -Destination $dest -Force
Write-Host "OK : $dest"
Write-Host ""
Write-Host "Ensuite :  npm run ml-api   (terminal 1)"
Write-Host "           npm run prometheus   (terminal 2)"
Write-Host "Navigateur : http://127.0.0.1:9090"

Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
