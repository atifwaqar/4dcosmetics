<#
.SYNOPSIS
    Repair-ClaudeJunction.ps1 - Relocate Claude Desktop data to D: via a hardened,
    self-healing NTFS junction.

.DESCRIPTION
    Claude Desktop has NO supported relocation. The data folder (not the binary)
    is the space hog; inside it, vm_bundles\rootfs.vhdx grows ~1GB per active
    session day. The only working relocation is an NTFS junction, which is
    UNSUPPORTED and can break after a major Windows update (especially the
    Store/MSIX package, which can be re-provisioned and overwrite the junction
    with a fresh real folder on C:).

    This script:
      * Defaults to DRY-RUN. It changes NOTHING unless you pass -Execute.
      * Performs the one-time relocation: moves the C: data folder to D: and
        replaces it with a junction.
      * Self-heals: if a Windows/Claude update recreates a REAL folder on C:,
        it backs that folder up (no data loss) and re-establishes the junction.
      * Can install a logon Scheduled Task that re-checks/heals automatically
        (-InstallTask).

    Targets the .exe install (%APPDATA%\Claude) by default, because the Store
    package is re-provisioned on update and will wipe the junction. Use
    -StoreInstall to target the Store package's data folder instead.

.PARAMETER Execute
    Actually perform changes. Without this, the script only reports what it WOULD do.

.PARAMETER DataDriveRoot
    Where the real Claude data lives on the other drive. Default: D:\ClaudeData

.PARAMETER StoreInstall
    Target the Store/MSIX data folder instead of the .exe install. NOT recommended.

.PARAMETER HealOnly
    Skip the initial relocation; only repair an existing/broken junction.

.PARAMETER InstallTask
    Register a logon Scheduled Task that runs this script with -Execute -HealOnly -Quiet.

.PARAMETER Quiet
    Reduce console output (used by the scheduled task).

.EXAMPLE
    # See what it would do (safe):
    powershell -ExecutionPolicy Bypass -File .\Repair-ClaudeJunction.ps1

.EXAMPLE
    # Do the relocation after you've reviewed the dry-run:
    powershell -ExecutionPolicy Bypass -File .\Repair-ClaudeJunction.ps1 -Execute

.NOTES
    PowerShell 5.1 compatible. Run as your normal user (junction is in your profile).
    Close Claude Desktop first. UNSUPPORTED workaround - keep the D:\ data backed up.
#>
[CmdletBinding()]
param(
    [switch]$Execute,
    [string]$DataDriveRoot = 'D:\ClaudeData',
    [switch]$StoreInstall,
    [switch]$HealOnly,
    [switch]$InstallTask,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

function Say {
    param([string]$Msg, [string]$Color = 'Gray')
    if (-not $Quiet) { Write-Host $Msg -ForegroundColor $Color }
}
function Plan {
    param([string]$Msg)
    if ($Execute) { Say ("[DO]   " + $Msg) 'Cyan' }
    else          { Say ("[DRY]  would: " + $Msg) 'Yellow' }
}

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
if ($env:OS -ne 'Windows_NT') {
    Write-Host 'This script only runs on Windows.' -ForegroundColor Red
    return
}

# Resolve the Claude data path Claude actually uses (the link site, on C:)
if ($StoreInstall) {
    $pkgRoot = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Packages')
    $pkg = $null
    if (Test-Path -LiteralPath $pkgRoot) {
        $pkg = Get-ChildItem -LiteralPath $pkgRoot -Directory -Force -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -like 'Claude*' } | Select-Object -First 1
    }
    if (-not $pkg) { Write-Host 'Store Claude package not found.' -ForegroundColor Red; return }
    $LinkPath = [System.IO.Path]::Combine($pkg.FullName, 'LocalCache\Roaming\Claude')
    Say 'WARNING: Targeting the Store/MSIX install. It can be re-provisioned on update and wipe this junction.' 'Red'
} else {
    $LinkPath = [System.IO.Path]::Combine($env:APPDATA, 'Claude')
}

$TargetPath = [System.IO.Path]::Combine($DataDriveRoot, 'Claude')
$DriveLetter = $DataDriveRoot.Substring(0,2)  # e.g. "D:"

Say '================ Repair-ClaudeJunction.ps1 ================' 'Cyan'
if (-not $Execute) { Say 'MODE: DRY-RUN (no changes). Re-run with -Execute to apply.' 'Yellow' }
else               { Say 'MODE: EXECUTE (will make changes).' 'Cyan' }
Say ('Link site (C:): ' + $LinkPath)
Say ('Real data (D:): ' + $TargetPath)
Say ''

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Test-IsReparsePoint {
    param([string]$Path)
    try {
        if (-not (Test-Path -LiteralPath $Path)) { return $false }
        $it = Get-Item -LiteralPath $Path -Force
        return (($it.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
    } catch { return $false }
}

function Get-ReparseTarget {
    param([string]$Path)
    try {
        $out = & cmd /c ("fsutil reparsepoint query `"" + $Path + "`"") 2>$null
        $line = $out | Where-Object { $_ -match 'Print Name:' } | Select-Object -First 1
        if ($line) { return ($line -replace '.*Print Name:\s*', '').Trim() }
    } catch {}
    return $null
}

function Remove-JunctionLinkOnly {
    # Removes the reparse point WITHOUT touching the target's contents.
    param([string]$Path)
    # cmd rmdir on a junction deletes only the link, not the target. Do NOT use
    # Remove-Item -Recurse on a junction.
    & cmd /c ("rmdir `"" + $Path + "`"") | Out-Null
}

function New-Junction {
    param([string]$Link, [string]$Target)
    New-Item -ItemType Junction -Path $Link -Target $Target -ErrorAction Stop | Out-Null
}

function Invoke-Robocopy {
    param([string]$Src, [string]$Dst, [switch]$Move)
    $rcArgs = @($Src, $Dst, '/E', '/COPY:DAT', '/DCOPY:DAT', '/R:1', '/W:1', '/NFL', '/NDL', '/NP')
    if ($Move) { $rcArgs += '/MOVE' }
    & robocopy @rcArgs | Out-Null
    # robocopy exit codes 0-7 are success/info; 8+ are failures.
    if ($LASTEXITCODE -ge 8) { throw ("robocopy failed (exit " + $LASTEXITCODE + ") copying " + $Src + " -> " + $Dst) }
}

function Test-ClaudeRunning {
    $p = Get-Process -Name 'Claude' -ErrorAction SilentlyContinue
    return ($null -ne $p)
}

# ---------------------------------------------------------------------------
# Safety checks
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath ($DriveLetter + '\'))) {
    Say ('Drive ' + $DriveLetter + ' not found. Aborting.') 'Red'
    return
}
if (Test-ClaudeRunning) {
    Say 'Claude Desktop appears to be RUNNING. Close it fully (check the tray) before applying.' 'Red'
    if ($Execute) { Say 'Refusing to modify a live data folder. Aborting.' 'Red'; return }
}

# ---------------------------------------------------------------------------
# Determine current state and act
# ---------------------------------------------------------------------------
$linkExists   = Test-Path -LiteralPath $LinkPath
$isJunction   = Test-IsReparsePoint $LinkPath
$targetExists = Test-Path -LiteralPath $TargetPath

# Ensure data drive root exists
if (-not (Test-Path -LiteralPath $DataDriveRoot)) {
    Plan ('create ' + $DataDriveRoot)
    if ($Execute) { New-Item -ItemType Directory -Path $DataDriveRoot -Force | Out-Null }
}

if ($isJunction) {
    $curTarget = Get-ReparseTarget $LinkPath
    if ($curTarget -and ($curTarget.TrimEnd('\').ToLowerInvariant() -eq $TargetPath.TrimEnd('\').ToLowerInvariant()) -and $targetExists) {
        Say ('HEALTHY: junction already points to ' + $curTarget) 'Green'
    }
    elseif ($targetExists) {
        Say ('Junction points to "' + $curTarget + '" but expected "' + $TargetPath + '". Re-pointing.') 'Yellow'
        Plan ('remove stale junction at ' + $LinkPath + ' (link only)')
        Plan ('recreate junction ' + $LinkPath + ' -> ' + $TargetPath)
        if ($Execute) { Remove-JunctionLinkOnly $LinkPath; New-Junction $LinkPath $TargetPath; Say 'Re-pointed.' 'Green' }
    }
    else {
        Say 'Junction exists but its target is MISSING (data may be lost or drive offline).' 'Red'
        Say ('Check that ' + $TargetPath + ' exists on ' + $DriveLetter + '. Not auto-fixing to avoid data loss.') 'Red'
    }
}
elseif ($linkExists) {
    # C: has a REAL folder (initial state, or update re-provisioned a fresh one).
    if (-not $targetExists) {
        if ($HealOnly) {
            Say 'HealOnly set but no junction exists yet and no D: target. Run without -HealOnly to do the initial relocation.' 'Yellow'
        } else {
            Say 'INITIAL RELOCATION: real folder on C:, nothing on D: yet.' 'Cyan'
            Plan ('move ' + $LinkPath + ' -> ' + $TargetPath + ' (robocopy /MOVE)')
            Plan ('create junction ' + $LinkPath + ' -> ' + $TargetPath)
            if ($Execute) {
                New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
                Invoke-Robocopy -Src $LinkPath -Dst $TargetPath -Move
                if (Test-Path -LiteralPath $LinkPath) { Remove-JunctionLinkOnly $LinkPath }  # remove leftover empty dir
                New-Junction $LinkPath $TargetPath
                Say 'Relocation complete. Verify Claude launches, then your C: space is freed.' 'Green'
            }
        }
    }
    else {
        # SELF-HEAL: both a real C: folder AND a D: target exist -> update re-provisioned C:.
        $stamp = (Get-Date -Format 'yyyyMMdd-HHmmss')
        $backup = [System.IO.Path]::Combine($DataDriveRoot, ('_pre-heal-backup-' + $stamp))
        Say 'SELF-HEAL: a real folder reappeared on C: while D: data still exists (update re-provisioned).' 'Yellow'
        Say 'To avoid ANY data loss, the new C: folder is backed up to D: before re-linking.' 'Yellow'
        Plan ('back up new C: folder ' + $LinkPath + ' -> ' + $backup + ' (robocopy /MOVE)')
        Plan ('recreate junction ' + $LinkPath + ' -> ' + $TargetPath)
        if ($Execute) {
            New-Item -ItemType Directory -Path $backup -Force | Out-Null
            Invoke-Robocopy -Src $LinkPath -Dst $backup -Move
            if (Test-Path -LiteralPath $LinkPath) { Remove-JunctionLinkOnly $LinkPath }
            New-Junction $LinkPath $TargetPath
            Say ('Re-linked. Review backup for anything new to merge: ' + $backup) 'Green'
        }
    }
}
else {
    # Nothing on C: at all.
    if ($targetExists) {
        Say 'No folder on C:, but D: target exists. Re-creating junction.' 'Yellow'
        Plan ('create junction ' + $LinkPath + ' -> ' + $TargetPath)
        if ($Execute) { New-Junction $LinkPath $TargetPath; Say 'Junction created.' 'Green' }
    } else {
        Say 'Neither C: data nor D: target exists yet. Launch Claude once to create its data folder, then re-run.' 'Yellow'
    }
}

# ---------------------------------------------------------------------------
# Optional: install logon self-heal task
# ---------------------------------------------------------------------------
if ($InstallTask) {
    $scriptPath = $MyInvocation.MyCommand.Path
    $taskName = 'ClaudeJunctionSelfHeal'
    $action = ('-NoProfile -ExecutionPolicy Bypass -File "' + $scriptPath + '" -Execute -HealOnly -Quiet -DataDriveRoot "' + $DataDriveRoot + '"')
    Plan ('register logon Scheduled Task "' + $taskName + '" running: powershell ' + $action)
    if ($Execute) {
        $a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $action
        $t = New-ScheduledTaskTrigger -AtLogOn
        $s = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
        Register-ScheduledTask -TaskName $taskName -Action $a -Trigger $t -Settings $s -Force | Out-Null
        Say ('Scheduled Task "' + $taskName + '" installed (runs at logon to re-heal the junction).') 'Green'
    }
}

Say ''
if (-not $Execute) { Say 'DRY-RUN finished. Nothing was changed. Re-run with -Execute to apply.' 'Yellow' }
else               { Say 'Done.' 'Cyan' }
