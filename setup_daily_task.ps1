# PowerShell Script to register Fitbit Interiors Autonomous Agent in Windows Task Scheduler
$TaskName = "FitbitInteriors_AutonomousOutreach"
$NodeExe = (Get-Command node).Source
$ScriptPath = Join-Path $PSScriptRoot "scheduler.js"

if (-not $NodeExe) {
    Write-Error "[!] Node.js executable not found in system PATH."
    exit 1
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "   FITBIT INTERIORS — WINDOWS TASK SCHEDULER INSTALLER" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "[*] Script Target: $ScriptPath"
Write-Host "[*] Node Target  : $NodeExe"

$Action = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$ScriptPath`"" -WorkingDirectory $PSScriptRoot
# Triggers daily at 8:30 AM (standard Ugandan commercial opening hours)
$Trigger = New-ScheduledTaskTrigger -Daily -At 8:30AM
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    # Unregister existing task if present
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Runs the 24-hour autonomous B2B lead discovery and outreach cycle for Fitbit Interiors."
    Write-Host "`n[+] Successfully registered Windows Scheduled Task: '$TaskName'!" -ForegroundColor Green
    Write-Host "    Scheduled: Daily at 8:30 AM" -ForegroundColor Green
    Write-Host "    To run immediately: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
} catch {
    Write-Host "`n[!] Could not register task automatically (requires Administrator privileges)." -ForegroundColor Red
    Write-Host "    Alternatively, double-click 'start_daemon.bat' anytime to keep the agent running in the background." -ForegroundColor Yellow
}
