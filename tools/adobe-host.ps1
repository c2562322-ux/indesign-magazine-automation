param(
    [string]$ProgId = 'InDesign.Application',
    [string]$ScriptPath,
    [string]$ResultPath,
    [ValidateRange(1,7200)][int]$TimeoutSeconds = 600
)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -ne 'Desktop') {
    throw 'Run with Windows PowerShell 5.1 (powershell.exe), outside the restricted sandbox.'
}
if ($ScriptPath) {
    $taskScript = (Resolve-Path -LiteralPath $ScriptPath).Path
    if ([IO.Path]::GetExtension($taskScript) -ne '.idjs') { throw 'Expected a UXP .idjs script.' }
    if (-not $ResultPath) { throw 'ResultPath is required: COM return alone does not prove UXP completion.' }
    $taskResult = [IO.Path]::GetFullPath($ResultPath)
}
try {
    $taskApp = [Runtime.InteropServices.Marshal]::GetActiveObject($ProgId)
    $taskConnection = 'running-object'
} catch {
    $taskAttachError = $_.Exception.GetBaseException().HResult
    $taskApp = New-Object -ComObject $ProgId
    $taskConnection = 'registered-server'
    Write-Output ('Running-object attachment unavailable: 0x{0:X8}; registered server connected.' -f $taskAttachError)
}
Write-Output ('CONNECTED ' + $taskConnection + ' / InDesign ' + $taskApp.Version + ' / documents ' + $taskApp.Documents.Count)
if (-not $ScriptPath) {
    for ($taskIndex = 1; $taskIndex -le $taskApp.Documents.Count; $taskIndex++) {
        $taskDoc = $taskApp.Documents.Item($taskIndex)
        Write-Output ('DOCUMENT ' + $taskDoc.Name + ' / pages ' + $taskDoc.Pages.Count)
    }
    return
}
$taskStarted = [DateTime]::UtcNow
# Adobe ScriptLanguage.UXPSCRIPT. The supplied script owns temporary-document cleanup.
$taskApp.DoScript($taskScript, 1431522407)
$taskDeadline = $taskStarted.AddSeconds($TimeoutSeconds)
do {
    if (Test-Path -LiteralPath $taskResult) {
        $taskInfo = Get-Item -LiteralPath $taskResult
        if ($taskInfo.LastWriteTimeUtc -ge $taskStarted -and $taskInfo.Length -gt 0) {
            try {
                $taskPayload = Get-Content -LiteralPath $taskResult -Raw -Encoding UTF8 | ConvertFrom-Json
                Write-Output ('RESULT ' + $taskResult)
                if ($taskPayload.counts) { $taskPayload.counts | ConvertTo-Json -Compress | Write-Output }
                return
            } catch { Write-Verbose 'Waiting for complete JSON write.' }
        }
    }
    Start-Sleep -Milliseconds 500
} while ([DateTime]::UtcNow -lt $taskDeadline)
throw 'No fresh, complete result JSON within timeout. UXP may still be running; do not launch another job or terminate InDesign automatically.'
