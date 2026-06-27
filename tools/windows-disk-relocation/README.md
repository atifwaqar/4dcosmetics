# Windows C:-drive cleanup & relocation

Tools to free your C: drive and relocate heavy data to D: **without losing data
or breaking Claude Desktop**. Built for PowerShell 5.1 (the Windows-default).

> These scripts are **not** part of the 4D Cosmetics storefront. They live here
> only because this is the branch the work was requested on.

## Files

| File | What it does | Safe by default? |
|------|--------------|------------------|
| `Scan-CDrive.ps1` | **READ-ONLY** scan & categorize C: usage. Writes a CSV to your Desktop. | Yes — changes nothing, ever. |
| `Repair-ClaudeJunction.ps1` | Relocates Claude Desktop data to D: via a hardened, self-healing NTFS junction. | Yes — **dry-run** unless you pass `-Execute`. |

## Phase 1 — Scan (read-only)

```powershell
powershell -ExecutionPolicy Bypass -File .\Scan-CDrive.ps1 -DeepScan
```

Buckets in the report:

- **CACHE_TEMP** — safe to clear, regenerates (temp, Windows Update cache, browser
  caches, package caches, Recycle Bin).
- **MOVABLE_SUPPORTED** — clean, Windows-supported relocation, no fragility
  (Downloads/Pictures/Videos, WSL distros, Docker data, Steam, package stores).
- **MOVABLE_JUNCTION** — Claude Desktop data; needs an unsupported NTFS junction.
- **REVIEW** — large/unrecognized or irreversible (e.g. `Windows.old`); you decide.
- **INFO** — system context (pagefile, hiberfil, Documents — kept on C:).

## Phase 2+ — Act (only after you approve each item)

Nothing here runs automatically. Clear caches / relocate the supported items
using the exact command or UI step printed in each finding's note.

### Claude Desktop (the one unsupported case)

Claude has **no supported relocation**. The only working method is an NTFS
junction, which is unsupported and can break after a major Windows update — the
**Store/MSIX** package especially, because it can be re-provisioned on update and
overwrite the junction. **Prefer the direct `.exe` install.**

```powershell
# 1. Close Claude fully (check the tray). Then preview (safe, no changes):
powershell -ExecutionPolicy Bypass -File .\Repair-ClaudeJunction.ps1

# 2. Apply the relocation:
powershell -ExecutionPolicy Bypass -File .\Repair-ClaudeJunction.ps1 -Execute

# 3. (Optional) auto-re-heal the junction at logon after Windows updates:
powershell -ExecutionPolicy Bypass -File .\Repair-ClaudeJunction.ps1 -Execute -InstallTask
```

The repair script is **self-healing**: if an update recreates a real folder on
C:, it backs that folder up to D: (no data loss) and re-establishes the junction.

## Hard rules honored

- **Documents stays on C:** never redirected (Claude/Cowork cross-drive hard-link
  bug). The scan reports it as INFO only.
- Every destructive step is gated behind your explicit confirmation; irreversible
  items (e.g. `Windows.old`) are flagged.
- Keep the D:\ClaudeData folder backed up — the junction is an unsupported
  workaround.
