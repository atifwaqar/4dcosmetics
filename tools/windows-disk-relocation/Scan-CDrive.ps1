<#
.SYNOPSIS
    Scan-CDrive.ps1 - READ-ONLY C: drive usage scanner and categorizer.

.DESCRIPTION
    Phase-1 tool for freeing/relocating C: drive data WITHOUT deleting or moving
    anything. This script ONLY reads. It never deletes, moves, links, or modifies
    a single byte. It sorts C: usage into buckets and writes a CSV report to your
    Desktop.

    Buckets:
      CACHE_TEMP        - Safe to clear; regenerates automatically.
      MOVABLE_SUPPORTED - Clean, Windows-supported relocation; no fragility.
      MOVABLE_JUNCTION  - Claude Desktop data; requires an (unsupported) NTFS
                          junction; flagged.
      REVIEW            - Large + unrecognized, or irreversible; you decide.
      INFO              - System/context only.

.PARAMETER DeepScan
    Also surface large unknown top-level folders under the user profile,
    ProgramData, and Program Files (slower).

.NOTES
    PowerShell 5.1 compatible. Access-denied / locked files are handled silently.
    Nothing is changed by this script.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Scan-CDrive.ps1 -DeepScan
#>
[CmdletBinding()]
param(
    [switch]$DeepScan
)

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
$script:IsWin    = ($env:OS -eq 'Windows_NT')
$script:Findings = New-Object System.Collections.Generic.List[object]
$script:DeepThresholdBytes = 1GB

# ---------------------------------------------------------------------------
# Helpers (all read-only)
# ---------------------------------------------------------------------------
function Get-FolderSizeBytes {
    param([string]$Path)
    if ([string]::IsNullOrEmpty($Path)) { return [int64]0 }
    try { if (-not (Test-Path -LiteralPath $Path)) { return [int64]0 } } catch { return [int64]0 }
    try {
        $sum = (Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
        if ($null -eq $sum) { return [int64]0 }
        return [int64]$sum
    } catch { return [int64]0 }
}

function Get-FileSizeBytes {
    param([string]$Path)
    if ([string]::IsNullOrEmpty($Path)) { return [int64]0 }
    try {
        $it = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
        if ($it -and -not $it.PSIsContainer) { return [int64]$it.Length }
        return [int64]0
    } catch { return [int64]0 }
}

function Get-RegValue {
    param([string]$Key, [string]$Name)
    if (-not $script:IsWin) { return $null }
    try {
        $p = Get-ItemProperty -Path $Key -Name $Name -ErrorAction Stop
        return $p.$Name
    } catch { return $null }
}

function Expand-Env {
    param([string]$Value)
    if ([string]::IsNullOrEmpty($Value)) { return $null }
    return [Environment]::ExpandEnvironmentVariables($Value)
}

function Add-Finding {
    param(
        [string]$Bucket,
        [string]$Name,
        [string]$Path,
        [int64]$SizeBytes = 0,
        [string]$Note = '',
        [bool]$ForceShow = $false
    )
    $exists = $false
    try { if ($Path) { $exists = Test-Path -LiteralPath $Path } } catch { $exists = $false }
    if (-not $exists -and -not $ForceShow -and $SizeBytes -le 0) { return }
    $script:Findings.Add([pscustomobject]@{
        Bucket    = $Bucket
        Name      = $Name
        Path      = $Path
        SizeBytes = $SizeBytes
        SizeGB    = [math]::Round(($SizeBytes / 1GB), 2)
        Note      = $Note
    }) | Out-Null
}

function Test-AlreadyCovered {
    param([string]$Path)
    if ([string]::IsNullOrEmpty($Path)) { return $true }
    $norm = $Path.TrimEnd('\').ToLowerInvariant()
    foreach ($f in $script:Findings) {
        if ([string]::IsNullOrEmpty($f.Path)) { continue }
        $fn = $f.Path.TrimEnd('\').ToLowerInvariant()
        if ($fn -eq $norm) { return $true }
        if ($fn.StartsWith($norm + '\')) { return $true }
        if ($norm.StartsWith($fn + '\')) { return $true }
    }
    return $false
}

# ---------------------------------------------------------------------------
# Probes
# ---------------------------------------------------------------------------
function Probe-TempAndCaches {
    # User + Windows Temp
    $temps = @()
    if ($env:TEMP)        { $temps += $env:TEMP }
    if ($env:TMP -and ($env:TMP -ne $env:TEMP)) { $temps += $env:TMP }
    $temps += 'C:\Windows\Temp'
    $seen = @{}
    foreach ($t in $temps) {
        if (-not $t) { continue }
        $key = $t.ToLowerInvariant()
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true
        Add-Finding 'CACHE_TEMP' 'Temp folder' $t (Get-FolderSizeBytes $t) 'Safe to clear; regenerates. Skips files in use.'
    }

    # Windows Update download cache
    $wu = 'C:\Windows\SoftwareDistribution\Download'
    Add-Finding 'CACHE_TEMP' 'Windows Update cache' $wu (Get-FolderSizeBytes $wu) 'Safe to clear (stop wuauserv first); regenerates.'

    # Recycle Bin
    $rb = [System.IO.Path]::Combine(($env:SystemDrive + '\'), '$Recycle.Bin')
    Add-Finding 'CACHE_TEMP' 'Recycle Bin' $rb (Get-FolderSizeBytes $rb) 'Empty via Recycle Bin; per-user, access-denied entries skipped.'
}

function Probe-PackageCaches {
    $up = $env:USERPROFILE
    $la = $env:LOCALAPPDATA
    $ad = $env:APPDATA

    if ($la) { Add-Finding 'CACHE_TEMP' 'npm cache'   ([System.IO.Path]::Combine($la,'npm-cache')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($la,'npm-cache'))) 'npm cache clean --force; or set cache to D:.' }
    if ($up) { Add-Finding 'CACHE_TEMP' 'npm cache (~/.npm)' ([System.IO.Path]::Combine($up,'.npm')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($up,'.npm'))) 'npm cache clean --force.' }

    if ($la) {
        Add-Finding 'CACHE_TEMP' 'NuGet http-cache' ([System.IO.Path]::Combine($la,'NuGet\v3-cache')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($la,'NuGet\v3-cache'))) 'dotnet nuget locals all --clear.'
        Add-Finding 'CACHE_TEMP' 'NuGet plugins-cache' ([System.IO.Path]::Combine($la,'NuGet\plugins-cache')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($la,'NuGet\plugins-cache'))) 'dotnet nuget locals all --clear.'
    }
    if ($up) { Add-Finding 'MOVABLE_SUPPORTED' 'NuGet global packages' ([System.IO.Path]::Combine($up,'.nuget\packages')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($up,'.nuget\packages'))) 'Relocate via env NUGET_PACKAGES=D:\... (supported).' }

    if ($la) { Add-Finding 'CACHE_TEMP' 'pip cache' ([System.IO.Path]::Combine($la,'pip\Cache')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($la,'pip\Cache'))) 'pip cache purge; or env PIP_CACHE_DIR.' }

    if ($up) {
        Add-Finding 'MOVABLE_SUPPORTED' 'Cargo home (~/.cargo)' ([System.IO.Path]::Combine($up,'.cargo')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($up,'.cargo'))) 'Relocate via env CARGO_HOME=D:\... (supported).'
        Add-Finding 'MOVABLE_SUPPORTED' 'Maven repo (~/.m2)' ([System.IO.Path]::Combine($up,'.m2\repository')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($up,'.m2\repository'))) 'Relocate via settings.xml <localRepository> or env (supported).'
        Add-Finding 'MOVABLE_SUPPORTED' 'Gradle caches (~/.gradle)' ([System.IO.Path]::Combine($up,'.gradle\caches')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($up,'.gradle\caches'))) 'Relocate via env GRADLE_USER_HOME=D:\... (supported).'
    }
    if ($la) { Add-Finding 'CACHE_TEMP' 'Yarn cache' ([System.IO.Path]::Combine($la,'Yarn\Cache')) (Get-FolderSizeBytes ([System.IO.Path]::Combine($la,'Yarn\Cache'))) 'yarn cache clean; or yarn config set cache-folder D:\...' }
}

function Probe-BrowserCaches {
    $la = $env:LOCALAPPDATA
    if (-not $la) { return }
    $cacheNames = @('Cache','Code Cache','GPUCache','Service Worker\CacheStorage')

    $chromiumRoots = @(
        @{ N='Chrome';        P=[System.IO.Path]::Combine($la,'Google\Chrome\User Data') },
        @{ N='Edge';          P=[System.IO.Path]::Combine($la,'Microsoft\Edge\User Data') },
        @{ N='Brave';         P=[System.IO.Path]::Combine($la,'BraveSoftware\Brave-Browser\User Data') }
    )
    foreach ($r in $chromiumRoots) {
        $root = $r.P
        if (-not (Test-Path -LiteralPath $root)) { continue }
        $total = [int64]0
        try {
            $profiles = Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue
            foreach ($pf in $profiles) {
                foreach ($cn in $cacheNames) {
                    $cp = [System.IO.Path]::Combine($pf.FullName, $cn)
                    if (Test-Path -LiteralPath $cp) { $total += (Get-FolderSizeBytes $cp) }
                }
            }
        } catch {}
        if ($total -gt 0) { Add-Finding 'CACHE_TEMP' ($r.N + ' browser cache') $root $total 'Regenerates; clear via browser settings (close browser first).' }
    }

    # Firefox (different layout: Profiles\*\cache2)
    $ff = [System.IO.Path]::Combine($la,'Mozilla\Firefox\Profiles')
    if (Test-Path -LiteralPath $ff) {
        $total = [int64]0
        try {
            $profiles = Get-ChildItem -LiteralPath $ff -Directory -Force -ErrorAction SilentlyContinue
            foreach ($pf in $profiles) {
                $cp = [System.IO.Path]::Combine($pf.FullName,'cache2')
                if (Test-Path -LiteralPath $cp) { $total += (Get-FolderSizeBytes $cp) }
            }
        } catch {}
        if ($total -gt 0) { Add-Finding 'CACHE_TEMP' 'Firefox browser cache' $ff $total 'Regenerates; clear via browser settings.' }
    }
}

function Probe-SystemFiles {
    # hiberfil.sys
    $hib = 'C:\hiberfil.sys'
    Add-Finding 'INFO' 'hiberfil.sys (hibernation)' $hib (Get-FileSizeBytes $hib) 'Free with: powercfg /h off (disables hibernation/Fast Startup). Not a copy-move.'

    # pagefile.sys
    $pf = 'C:\pagefile.sys'
    Add-Finding 'INFO' 'pagefile.sys (virtual memory)' $pf (Get-FileSizeBytes $pf) 'Relocatable via System > Advanced > Performance > Virtual Memory. Keep a small one on C: for crash dumps.'

    # Windows.old
    $wo = 'C:\Windows.old'
    Add-Finding 'REVIEW' 'Windows.old (previous Windows)' $wo (Get-FolderSizeBytes $wo) 'IRREVERSIBLE: removing loses rollback to prior Windows. Use Disk Cleanup > Previous installations.'
}

function Probe-ShellFolders {
    $usf = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders'

    $downloads = Expand-Env (Get-RegValue $usf '{374DE290-123F-4565-9164-39C4925E467B}')
    $pictures  = Expand-Env (Get-RegValue $usf 'My Pictures')
    $videos    = Expand-Env (Get-RegValue $usf 'My Video')
    $documents = Expand-Env (Get-RegValue $usf 'Personal')

    if ($downloads) { Add-Finding 'MOVABLE_SUPPORTED' 'Downloads folder' $downloads (Get-FolderSizeBytes $downloads) 'Relocate via folder Properties > Location > Move (supported).' }
    if ($pictures)  { Add-Finding 'MOVABLE_SUPPORTED' 'Pictures folder'  $pictures  (Get-FolderSizeBytes $pictures)  'Relocate via folder Properties > Location > Move (supported).' }
    if ($videos)    { Add-Finding 'MOVABLE_SUPPORTED' 'Videos folder'    $videos    (Get-FolderSizeBytes $videos)    'Relocate via folder Properties > Location > Move (supported).' }
    if ($documents) { Add-Finding 'INFO' 'Documents folder' $documents (Get-FolderSizeBytes $documents) 'DO NOT relocate to D:. Claude/Cowork cross-drive hard-link bug breaks tasks. Keep on C:.' }
}

function Probe-WSL {
    $la = $env:LOCALAPPDATA

    # Registry-registered distros
    $lxssBase = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss'
    if ($script:IsWin) {
        try {
            $distros = Get-ChildItem -Path $lxssBase -ErrorAction SilentlyContinue
            foreach ($d in $distros) {
                $name = (Get-ItemProperty -Path $d.PSPath -Name 'DistributionName' -ErrorAction SilentlyContinue).DistributionName
                $bp   = (Get-ItemProperty -Path $d.PSPath -Name 'BasePath' -ErrorAction SilentlyContinue).BasePath
                if ($bp) {
                    $bp = $bp -replace '^\\\\\?\\',''  # strip \\?\ prefix
                    $vhdx = [System.IO.Path]::Combine($bp,'ext4.vhdx')
                    if (-not $name) { $name = $d.PSChildName }
                    if ($bp -match '^[Cc]:') {
                        Add-Finding 'MOVABLE_SUPPORTED' ("WSL distro: " + $name) $vhdx (Get-FileSizeBytes $vhdx) 'Relocate: wsl --export then wsl --import to D:\ (supported).'
                    } else {
                        Add-Finding 'INFO' ("WSL distro (already off C:): " + $name) $vhdx (Get-FileSizeBytes $vhdx) 'Already off C:.'
                    }
                }
            }
        } catch {}
    }

    # Store-packaged distros: %LOCALAPPDATA%\Packages\*\LocalState\*.vhdx
    if ($la) {
        $pkgRoot = [System.IO.Path]::Combine($la,'Packages')
        if (Test-Path -LiteralPath $pkgRoot) {
            try {
                $cands = Get-ChildItem -LiteralPath $pkgRoot -Directory -Force -ErrorAction SilentlyContinue |
                         Where-Object { $_.Name -match 'WSL|Ubuntu|Debian|Kali|SUSE|Linux|Pengwin|Oracle|Fedora' }
                foreach ($c in $cands) {
                    $ls = [System.IO.Path]::Combine($c.FullName,'LocalState')
                    if (Test-Path -LiteralPath $ls) {
                        $vhdxs = Get-ChildItem -LiteralPath $ls -Filter '*.vhdx' -File -Force -ErrorAction SilentlyContinue
                        foreach ($v in $vhdxs) {
                            if (Test-AlreadyCovered $v.FullName) { continue }
                            Add-Finding 'MOVABLE_SUPPORTED' ("WSL distro (Store): " + $c.Name) $v.FullName (Get-FileSizeBytes $v.FullName) 'Relocate: wsl --export then wsl --import to D:\ (supported).'
                        }
                    }
                }
            } catch {}
        }
    }
}

function Probe-Docker {
    $la = $env:LOCALAPPDATA
    if (-not $la) { return }
    $dockerData = [System.IO.Path]::Combine($la,'Docker')
    Add-Finding 'MOVABLE_SUPPORTED' 'Docker Desktop data' $dockerData (Get-FolderSizeBytes $dockerData) 'Relocate via Docker Desktop > Settings > Resources > Advanced > Disk image location (supported).'

    $dockerWslData = [System.IO.Path]::Combine($la,'Docker\wsl\data\ext4.vhdx')
    if (Test-Path -LiteralPath $dockerWslData) {
        if (-not (Test-AlreadyCovered $dockerWslData)) {
            Add-Finding 'MOVABLE_SUPPORTED' 'Docker WSL data disk' $dockerWslData (Get-FileSizeBytes $dockerWslData) 'Moved together with Docker disk image location setting.'
        }
    }
}

function Probe-Steam {
    $candidates = New-Object System.Collections.Generic.List[string]
    $sp = Get-RegValue 'HKCU:\Software\Valve\Steam' 'SteamPath'
    if ($sp) { $candidates.Add(($sp -replace '/','\')) | Out-Null }
    $candidates.Add('C:\Program Files (x86)\Steam') | Out-Null

    $seen = @{}
    foreach ($s in $candidates) {
        if (-not $s) { continue }
        $key = $s.ToLowerInvariant()
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true
        $apps = [System.IO.Path]::Combine($s,'steamapps')
        if (Test-Path -LiteralPath $apps) {
            if ($s -match '^[Cc]:') {
                Add-Finding 'MOVABLE_SUPPORTED' 'Steam steamapps' $apps (Get-FolderSizeBytes $apps) 'Relocate via Steam > Settings > Storage > add D:\ library, then Move install (supported).'
            } else {
                Add-Finding 'INFO' 'Steam steamapps (off C:)' $apps (Get-FolderSizeBytes $apps) 'Already off C:.'
            }
        }
    }
}

function Probe-Claude {
    # .exe install
    $ad = $env:APPDATA
    if ($ad) {
        $exeClaude = [System.IO.Path]::Combine($ad,'Claude')
        if (Test-Path -LiteralPath $exeClaude) {
            $total = Get-FolderSizeBytes $exeClaude
            Add-Finding 'MOVABLE_JUNCTION' 'Claude Desktop data (.exe install)' $exeClaude $total 'PREFERRED install. Relocate ONLY via NTFS junction (unsupported; can break after major Windows update).'
            $vm = [System.IO.Path]::Combine($exeClaude,'vm_bundles')
            if (Test-Path -LiteralPath $vm) {
                Add-Finding 'MOVABLE_JUNCTION' '  - Claude vm_bundles (.exe)' $vm (Get-FolderSizeBytes $vm) 'Largest sub-component; contains the VM disk.'
                $vhdx = [System.IO.Path]::Combine($vm,'rootfs.vhdx')
                if (Test-Path -LiteralPath $vhdx) {
                    Add-Finding 'MOVABLE_JUNCTION' '    - rootfs.vhdx (.exe VM disk)' $vhdx (Get-FileSizeBytes $vhdx) 'Grows ~1GB per active session day.'
                }
            }
        }
    }

    # Store / MSIX install
    $la = $env:LOCALAPPDATA
    if ($la) {
        $pkgRoot = [System.IO.Path]::Combine($la,'Packages')
        if (Test-Path -LiteralPath $pkgRoot) {
            try {
                $pkgs = Get-ChildItem -LiteralPath $pkgRoot -Directory -Force -ErrorAction SilentlyContinue |
                        Where-Object { $_.Name -like 'Claude*' }
                foreach ($pkg in $pkgs) {
                    $storeClaude = [System.IO.Path]::Combine($pkg.FullName,'LocalCache\Roaming\Claude')
                    if (Test-Path -LiteralPath $storeClaude) {
                        Add-Finding 'MOVABLE_JUNCTION' ('Claude Desktop data (Store/MSIX): ' + $pkg.Name) $storeClaude (Get-FolderSizeBytes $storeClaude) 'Store package can be re-provisioned on update and WIPE a junction. Prefer the .exe install.'
                        $vm = [System.IO.Path]::Combine($storeClaude,'vm_bundles')
                        if (Test-Path -LiteralPath $vm) {
                            Add-Finding 'MOVABLE_JUNCTION' '  - Claude vm_bundles (Store)' $vm (Get-FolderSizeBytes $vm) 'Largest sub-component; contains the VM disk.'
                            $vhdx = [System.IO.Path]::Combine($vm,'rootfs.vhdx')
                            if (Test-Path -LiteralPath $vhdx) {
                                Add-Finding 'MOVABLE_JUNCTION' '    - rootfs.vhdx (Store VM disk)' $vhdx (Get-FileSizeBytes $vhdx) 'Grows ~1GB per active session day.'
                            }
                        }
                    }
                }
            } catch {}
        }
    }
}

function Probe-DeepScan {
    if (-not $DeepScan) { return }
    $roots = @()
    if ($env:USERPROFILE)        { $roots += $env:USERPROFILE }
    if ($env:ProgramData)        { $roots += $env:ProgramData }
    if ($env:ProgramFiles)       { $roots += $env:ProgramFiles }
    if (${env:ProgramFiles(x86)}){ $roots += ${env:ProgramFiles(x86)} }

    foreach ($root in $roots) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        try {
            $children = Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue
            foreach ($c in $children) {
                if (Test-AlreadyCovered $c.FullName) { continue }
                $sz = Get-FolderSizeBytes $c.FullName
                if ($sz -ge $script:DeepThresholdBytes) {
                    Add-Finding 'REVIEW' ('DeepScan: ' + $c.Name) $c.FullName $sz ('Large unrecognized folder under ' + $root + '. You decide.')
                }
            }
        } catch {}
    }
}

# ---------------------------------------------------------------------------
# Run probes
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '================ Scan-CDrive.ps1  (READ-ONLY) ================' -ForegroundColor Cyan
if (-not $script:IsWin) {
    Write-Host 'WARNING: Not running on Windows. Windows-only paths will be empty.' -ForegroundColor Yellow
    Write-Host '         This is expected when smoke-testing the script logic.' -ForegroundColor Yellow
}
Write-Host ('Started: ' + (Get-Date)) -ForegroundColor DarkGray
Write-Host 'Scanning... (large folders may take a minute; access-denied entries are skipped)' -ForegroundColor DarkGray
Write-Host ''

Probe-TempAndCaches
Probe-PackageCaches
Probe-BrowserCaches
Probe-SystemFiles
Probe-ShellFolders
Probe-WSL
Probe-Docker
Probe-Steam
Probe-Claude
Probe-DeepScan

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
$bucketOrder = @('CACHE_TEMP','MOVABLE_SUPPORTED','MOVABLE_JUNCTION','REVIEW','INFO')
$bucketColor = @{
    'CACHE_TEMP'        = 'Green'
    'MOVABLE_SUPPORTED' = 'Cyan'
    'MOVABLE_JUNCTION'  = 'Magenta'
    'REVIEW'            = 'Yellow'
    'INFO'              = 'DarkGray'
}

function Format-GB { param([int64]$b) return ('{0,8:N2} GB' -f ($b / 1GB)) }

Write-Host ''
Write-Host '======================= REPORT =======================' -ForegroundColor Cyan

foreach ($bucket in $bucketOrder) {
    $items = $script:Findings | Where-Object { $_.Bucket -eq $bucket } | Sort-Object -Property SizeBytes -Descending
    if (-not $items -or $items.Count -eq 0) { continue }
    $bucketTotal = ($items | Measure-Object -Property SizeBytes -Sum).Sum
    if ($null -eq $bucketTotal) { $bucketTotal = 0 }
    $color = $bucketColor[$bucket]
    Write-Host ''
    Write-Host ("=== {0}  (total {1}) ===" -f $bucket, (Format-GB ([int64]$bucketTotal))) -ForegroundColor $color
    foreach ($i in $items) {
        Write-Host ("  {0}  {1}" -f (Format-GB ([int64]$i.SizeBytes)), $i.Name) -ForegroundColor $color
        Write-Host ("            {0}" -f $i.Path) -ForegroundColor DarkGray
        if ($i.Note) { Write-Host ("            > {0}" -f $i.Note) -ForegroundColor DarkGray }
    }
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
function Sum-Bucket { param([string]$b)
    $s = ($script:Findings | Where-Object { $_.Bucket -eq $b } | Measure-Object -Property SizeBytes -Sum).Sum
    if ($null -eq $s) { return [int64]0 }
    return [int64]$s
}

$clearNow   = Sum-Bucket 'CACHE_TEMP'
$movSupp    = Sum-Bucket 'MOVABLE_SUPPORTED'
$movJunc    = Sum-Bucket 'MOVABLE_JUNCTION'
$review     = Sum-Bucket 'REVIEW'

Write-Host ''
Write-Host '======================= SUMMARY =======================' -ForegroundColor Cyan

if ($script:IsWin) {
    try {
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction Stop
        if ($disk) {
            $freeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
            $sizeGB = [math]::Round($disk.Size / 1GB, 2)
            Write-Host ("C: drive: {0} GB free of {1} GB" -f $freeGB, $sizeGB) -ForegroundColor White
        }
    } catch {}
}

Write-Host ("Clearable NOW (CACHE_TEMP)      : {0}" -f (Format-GB $clearNow))   -ForegroundColor Green
Write-Host ("Movable - SUPPORTED (clean)     : {0}" -f (Format-GB $movSupp))    -ForegroundColor Cyan
Write-Host ("Movable - JUNCTION (Claude only) : {0}" -f (Format-GB $movJunc))   -ForegroundColor Magenta
Write-Host ("Review (you decide)             : {0}" -f (Format-GB $review))     -ForegroundColor Yellow
Write-Host ("Total addressable               : {0}" -f (Format-GB ([int64]($clearNow + $movSupp + $movJunc + $review)))) -ForegroundColor White

# ---------------------------------------------------------------------------
# CSV export to Desktop
# ---------------------------------------------------------------------------
$desktop = $null
try { $desktop = [Environment]::GetFolderPath('Desktop') } catch { $desktop = $null }
if ([string]::IsNullOrEmpty($desktop) -or -not (Test-Path -LiteralPath $desktop)) { $desktop = (Get-Location).Path }
$csvPath = [System.IO.Path]::Combine($desktop, 'Scan-CDrive-Report.csv')

try {
    $script:Findings |
        Sort-Object -Property @{Expression='Bucket'}, @{Expression='SizeBytes';Descending=$true} |
        Select-Object Bucket, Name, SizeGB, SizeBytes, Path, Note |
        Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
    Write-Host ''
    Write-Host ("CSV written: {0}" -f $csvPath) -ForegroundColor White
} catch {
    Write-Host ''
    Write-Host ("Could not write CSV to {0}: {1}" -f $csvPath, $_.Exception.Message) -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Done. This script changed nothing.' -ForegroundColor Cyan
