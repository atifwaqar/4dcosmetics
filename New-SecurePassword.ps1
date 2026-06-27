<#
.SYNOPSIS
    Generates cryptographically secure, bias-free random passwords.

.DESCRIPTION
    New-SecurePassword produces high-entropy passwords using the operating
    system's cryptographic random number generator
    (System.Security.Cryptography.RandomNumberGenerator). It NEVER falls back
    to PowerShell's general-purpose random cmdlet or the .NET pseudo-random
    class, both of which are predictable and unsafe for generating secrets.

    Character indices are drawn with rejection sampling so there is no modulo
    bias: every character in the pool is equally likely. The result is
    guaranteed to contain at least one character from each enabled class, and
    the whole string is then shuffled with a cryptographically seeded
    Fisher-Yates shuffle so the guaranteed characters are not positionally
    predictable.

    Compatible with Windows PowerShell 5.1 and PowerShell 7+.

.PARAMETER Length
    Total length of each password. Default 24. Must be at least the number of
    enabled character classes.

.PARAMETER Count
    Number of passwords to generate. Default 1.

.PARAMETER NoUpper
    Exclude uppercase letters (A-Z).

.PARAMETER NoLower
    Exclude lowercase letters (a-z).

.PARAMETER NoDigits
    Exclude digits (0-9).

.PARAMETER NoSymbols
    Exclude symbol characters.

.PARAMETER ExcludeAmbiguous
    Strip visually ambiguous characters (O 0 o l 1 I |) from the pools.

.PARAMETER ToClipboard
    Copy the generated password(s) to the clipboard instead of (only)
    returning them.

.EXAMPLE
    New-SecurePassword
    Generates one 24-character password using all four character classes.

.EXAMPLE
    New-SecurePassword -Length 32 -Count 5
    Generates five 32-character passwords.

.EXAMPLE
    New-SecurePassword -Length 16 -NoSymbols -ExcludeAmbiguous
    Generates one 16-character alphanumeric password with no ambiguous
    characters.

.EXAMPLE
    New-SecurePassword -Length 20 -ToClipboard
    Generates a 20-character password and copies it to the clipboard.

.NOTES
    Uses only System.Security.Cryptography.RandomNumberGenerator.
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 4096)]
    [int]$Length = 24,

    [ValidateRange(1, 100000)]
    [int]$Count = 1,

    [switch]$NoUpper,
    [switch]$NoLower,
    [switch]$NoDigits,
    [switch]$NoSymbols,
    [switch]$ExcludeAmbiguous,
    [switch]$ToClipboard
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Cryptographic primitive: one CSPRNG instance for the whole run ---------
$script:Rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

# Returns an unbiased integer in [0, MaxExclusive) using rejection sampling
# over 4 random bytes. A plain "byte % poolSize" would introduce modulo bias;
# we reject any draw that lands in the short final bucket so every value in
# range is exactly equally likely. Works for any bound up to 2^32.
function Get-SecureRandomIndex {
    param(
        [Parameter(Mandatory = $true)]
        [int]$MaxExclusive
    )

    if ($MaxExclusive -le 0) {
        throw "MaxExclusive must be positive (got $MaxExclusive)."
    }
    if ($MaxExclusive -eq 1) { return 0 }

    $m = [uint64]$MaxExclusive
    # Total number of distinct 4-byte values is 2^32.
    $range = [uint64]4294967296
    # Largest multiple of $m that fits in [0, 2^32); reject anything >= it.
    $limit = $range - ($range % $m)

    $bytes = New-Object byte[] 4
    do {
        $script:Rng.GetBytes($bytes)
        $value = [uint64][System.BitConverter]::ToUInt32($bytes, 0)
    } while ($value -ge $limit)

    return [int]($value % $m)
}

# Picks one random character from a string using the unbiased index function.
function Get-SecureRandomChar {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Pool
    )
    $i = Get-SecureRandomIndex -MaxExclusive $Pool.Length
    return $Pool[$i]
}

# Cryptographically seeded Fisher-Yates shuffle (in place) on a char array.
function Invoke-SecureShuffle {
    param(
        [Parameter(Mandatory = $true)]
        [char[]]$Array
    )
    for ($i = $Array.Length - 1; $i -gt 0; $i--) {
        $j = Get-SecureRandomIndex -MaxExclusive ($i + 1)
        $tmp = $Array[$i]
        $Array[$i] = $Array[$j]
        $Array[$j] = $tmp
    }
    return $Array
}

try {
    # --- Build the character classes ----------------------------------------
    $upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    $lower   = 'abcdefghijklmnopqrstuvwxyz'
    $digits  = '0123456789'
    $symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?/'

    if ($ExcludeAmbiguous) {
        # Strip visually ambiguous characters: O 0 o l 1 I |
        $ambiguous = 'O0ol 1I|'.ToCharArray()
        $strip = {
            param($s)
            $sb = New-Object System.Text.StringBuilder
            foreach ($ch in $s.ToCharArray()) {
                if ($ambiguous -notcontains $ch) { [void]$sb.Append($ch) }
            }
            return $sb.ToString()
        }
        $upper   = & $strip $upper
        $lower   = & $strip $lower
        $digits  = & $strip $digits
        $symbols = & $strip $symbols
    }

    # --- Assemble the enabled classes ---------------------------------------
    $classes = @()
    if (-not $NoUpper)   { $classes += $upper }
    if (-not $NoLower)   { $classes += $lower }
    if (-not $NoDigits)  { $classes += $digits }
    if (-not $NoSymbols) { $classes += $symbols }

    # Drop any class that became empty after ExcludeAmbiguous (none normally do).
    $classes = @($classes | Where-Object { $_.Length -gt 0 })

    # --- Validate -----------------------------------------------------------
    if ($classes.Count -eq 0) {
        throw 'No character classes enabled. Enable at least one class (do not disable all of -NoUpper/-NoLower/-NoDigits/-NoSymbols).'
    }
    if ($Length -lt $classes.Count) {
        throw "Length ($Length) is smaller than the number of enabled character classes ($($classes.Count)). Increase -Length or disable some classes."
    }

    $allChars = ($classes -join '')

    # --- Generate -----------------------------------------------------------
    $results = New-Object System.Collections.Generic.List[string]
    for ($n = 0; $n -lt $Count; $n++) {
        $chars = New-Object char[] $Length

        # Guarantee one character from each enabled class first.
        for ($c = 0; $c -lt $classes.Count; $c++) {
            $chars[$c] = Get-SecureRandomChar -Pool $classes[$c]
        }
        # Fill the rest from the combined pool.
        for ($c = $classes.Count; $c -lt $Length; $c++) {
            $chars[$c] = Get-SecureRandomChar -Pool $allChars
        }

        # Shuffle so guaranteed characters are not in fixed positions.
        $chars = Invoke-SecureShuffle -Array $chars
        $results.Add(-join $chars)
    }

    # --- Output -------------------------------------------------------------
    if ($ToClipboard) {
        $clip = $results -join [Environment]::NewLine
        if (Get-Command Set-Clipboard -ErrorAction SilentlyContinue) {
            try {
                Set-Clipboard -Value $clip
                Write-Verbose 'Password(s) copied to clipboard.'
            } catch {
                Write-Warning "Could not copy to clipboard: $($_.Exception.Message)"
            }
        } else {
            Write-Warning 'Set-Clipboard is not available on this platform; password(s) returned only.'
        }
    }

    return $results.ToArray()
}
finally {
    if ($script:Rng) { $script:Rng.Dispose() }
}
