param([ValidateSet('start','stop')][string]$Action = 'start')
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskDatabase = [IO.Path]::GetFullPath((Join-Path $taskRoot '.local-data/postgres'))
if (-not $taskDatabase.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Database path is outside the project.' }
if (-not (Test-Path -LiteralPath (Join-Path $taskDatabase 'PG_VERSION'))) { throw 'This checkout has no initialized local database. Configure DATABASE_URL with your own PostgreSQL instance.' }
if ($Action -eq 'stop') { & pg_ctl -D $taskDatabase -m fast stop }
else {
  & pg_ctl -D $taskDatabase status
  if ($LASTEXITCODE -ne 0) { & pg_ctl -D $taskDatabase -l (Join-Path $taskRoot '.local-data/postgres.log') -o '-h 127.0.0.1 -p 55439 -B 64MB -N 40' start }
}
