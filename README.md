# SummitNext Attendance

Local PHP attendance application with independent **Marketplace** and **Food** workspaces.

Open [the dashboard](http://localhost/attendance_php/) or double-click **Open Dashboard.url**. Start Apache in XAMPP first.

**Browse [the directory guide](docs/DIRECTORY.md).** Start with [the handover guide](docs/HANDOVER.md), or use [the file map](docs/FILE-MAP.md) to find the code for a feature.

## Project layout

| Folder | Contents |
| --- | --- |
| `app/` | Current application source and deployable files |
| `app/assets/js/` | Navigation, dashboards, dialogs, uploads and theme behavior |
| `app/assets/css/` | Layout and theme styles |
| `app/includes/` | Shared PHP logic, storage and page controllers |
| `app/views/` | HTML/PHP templates |
| `scripts/` | Checks, installation, packaging and demo preview |
| `tests/` | Unit and PHP integration tests |
| `docs/` | Handover, feature behavior, file map and storage reference |
| `releases/` | Generated handover ZIP and checksum |
| `backups/local/` | Preserved installation and source backups |
| `archive/previous-version/` | Older dashboards, reports, snapshots and tools |

## Update the application

Run these commands from this project folder:

```powershell
node scripts/check.mjs
node scripts/check.mjs --integration
& '.\scripts\Install Attendance PHP.ps1'
```

The installer copies `app/` to `C:\xampp\htdocs\attendance_php`, verifies the files, and preserves stored workbooks and selections. Make future code changes in `app/` and run the installer to apply them.

## Prepare a handover

```powershell
node scripts/build-release.mjs
```

The ZIP in `releases/` contains the current source, documentation, scripts and tests, plus a file manifest. Staff workbooks, runtime indexes, backups and archived versions are excluded. See [data storage](docs/DATA-STORAGE.md) for a separate authorized data transfer.

No dependency installation is required. PHP runs the app; Node.js is used for development checks, preview and packaging. Requirements and recovery instructions are in the handover guide.

## Original project files

This is the original **attendance php** Git working folder. Its former loose files are preserved in `archive/previous-version/original-flat-layout-20261122-135236`, with an `ORIGINAL-FILES.json` checksum manifest. Git history remains in the root `.git` folder. Current source is organized under `app/` and matches the working SummitNext application.
