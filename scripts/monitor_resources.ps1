# Utility Script: monitor_resources.ps1
# Purpose: Continuously log node.exe (Port 3000) CPU % and RAM (MB) during performance test runs
param (
    [string]$OutputFile = "evidence\resource_monitor_log.csv",
    [int]$IntervalSeconds = 3
)

$header = "Timestamp,PID,ProcessName,CPU_Seconds,WorkingSet_MB,PrivateMemory_MB"
if (-not (Test-Path $OutputFile)) {
    Set-Content -Path $OutputFile -Value $header
}

Write-Host "[MONITOR] Locating SUT backend on port 3000..."

while ($true) {
    try {
        $conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
        $pidTarget = if ($conn) { $conn.OwningProcess } else { $null }

        if ($pidTarget) {
            $proc = Get-Process -Id $pidTarget -ErrorAction SilentlyContinue
            if ($proc) {
                $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                $pidVal = $proc.Id
                $name = $proc.ProcessName
                $wsMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
                $pmMB = [math]::Round($proc.PrivateMemorySize64 / 1MB, 2)
                $cpuSec = [math]::Round($proc.CPU, 2)

                $line = "$timestamp,$pidVal,$name,$cpuSec,$wsMB,$pmMB"
                Add-Content -Path $OutputFile -Value $line
            }
        }
    } catch {
        # ignore transient read errors
    }
    Start-Sleep -Seconds $IntervalSeconds
}
