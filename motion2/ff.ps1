# Надёжный доступ к ffmpeg на Z: (диск периодически отваливается)
$W = "Z:\lenдинги\motion2\.work"

function Get-FF {
    for ($i = 0; $i -lt 12; $i++) {
        $p = "$W\ffmpeg2.exe"
        if (Test-Path $p) {
            try { [System.IO.File]::OpenRead($p).Close(); return $p } catch { }
        }
        Start-Sleep -Milliseconds 700
    }
    throw "ffmpeg2.exe недоступен на Z:"
}

function Invoke-FF {
    param([string[]]$Args, [int]$TimeoutSec = 900)
    $ff = Get-FF
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $ff
    $psi.Arguments = ($Args | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join ' '
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $p = [System.Diagnostics.Process]::Start($psi)
    if (-not $p.WaitForExit($TimeoutSec * 1000)) {
        try { $p.Kill() } catch { }
        throw "ffmpeg превысил лимит $TimeoutSec с"
    }
    $err = $p.StandardError.ReadToEnd()
    if ($p.ExitCode -ne 0) { throw "ffmpeg: $err" }
    return $err
}

# вызов: Invoke-FF @('-y','-i','file.mp4', ...)
