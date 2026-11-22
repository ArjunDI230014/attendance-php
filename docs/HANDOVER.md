# Handover guide

## Current system

- **Application:** SummitNext Attendance.
- **Source:** `app/` in this project.
- **Installed copy:** `C:\xampp\htdocs\attendance_php`.
- **Entry point:** http://localhost/attendance_php/.
- **Workspaces:** Marketplace and Food, each with its own workbooks, attendance selection and archive.
- **Operation:** Local XAMPP Apache/PHP; no database or Node server is needed for normal use.

The former flat source from this Git project is preserved under `archive/previous-version/original-flat-layout-20261122-135236`. The current installer targets `attendance_php`.

## Requirements

For normal use, install XAMPP with PHP 8.1 or newer and enable `zip`, `dom`, `xmlreader` and `mbstring`. Use a modern browser with JavaScript enabled. Apache must allow the included `.htaccess` rules; they restrict the application to this computer, set the `.mjs` MIME type and support workbook uploads up to 30 MB.

For development, use Node.js 20 or newer and make `php` available on PATH. Set `PHP_BINARY` if needed, for example:

```powershell
$env:PHP_BINARY = 'C:\xampp\php\php.exe'
```

All development commands use bundled libraries and Node built-ins. There is no npm install step.

## First installation or update

1. Unpack the handover ZIP into a project folder.
2. Open PowerShell in that folder and run the checks below.
3. Run `& '.\scripts\Install Attendance PHP.ps1'`.
4. Start Apache in XAMPP and open http://localhost/attendance_php/.
5. Choose a workspace and open Excel files to upload or select a workbook.

The installer supports fresh installations and updates of the existing attendance app. It briefly disables web access, waits for file operations, creates a verified backup in `backups/local/`, recursively installs the organized source, and restores web access. It verifies that existing workbook files, indexes and saved selections have not changed. Known obsolete flat application files are moved into the backup after the organized files are verified.

Public PHP page URLs are unchanged. Apache redirects old flat JavaScript/CSS URLs to `assets/` so already-open tabs can finish their work during this layout migration.

A different destination can be selected explicitly:

```powershell
& '.\scripts\Install Attendance PHP.ps1' -TargetDirectory 'C:\xampp\htdocs\summitnext_attendance'
```

Open the URL matching that folder. The supplied shortcut uses the default `attendance_php` location.

## Checks

```powershell
node scripts/check.mjs                 # PHP/JS syntax and unit tests
node scripts/check.mjs --integration   # Temporary PHP server and synthetic workbooks
node scripts/check.mjs --all           # Both sets of checks
```

Equivalent npm commands are `npm test`, `npm run test:integration` and `npm run test:all`.

The integration suite covers uploads, persistent workbook selection across sessions and PHP restarts, section isolation, downloads, rename, archive, restore, delete and CSRF checks. Unit tests cover navigation concurrency, loading state, theme transitions, dialogs and browser state separation.

## Find and change a feature

Use [FILE-MAP.md](FILE-MAP.md) for exact source locations. Typical changes follow this sequence:

1. Edit the relevant template, stylesheet, JavaScript module or PHP include in `app/`.
2. Run the checks appropriate to the change.
3. Run the installer to update the local Apache copy.
4. Refresh the browser once after a code deployment. Existing open tabs retain already-loaded JavaScript modules until refreshed.
5. Check the affected feature in both workspaces when storage or navigation is involved.

The in-app router initializes each new view and releases listeners from the previous view. When adding a page with JavaScript behavior, expose an initializer and cleanup function and register them in `app/assets/js/navigation/navigation.mjs`. Keep public PHP URLs at the application root; internal includes and views are protected by their own `.htaccess` files.

## Demo preview

```powershell
node scripts/preview-navigation.mjs
```

Open the printed URL, normally http://127.0.0.1:4186/. The preview creates synthetic Food and Marketplace attendance in temporary storage. Ctrl+C stops the preview and removes its temporary files.

## Package a release

Update the version in `package.json`, run the checks, then run:

```powershell
node scripts/build-release.mjs
```

The output is `releases/SummitNext-Attendance-<version>.zip` and a `.sha256` checksum file. The ZIP includes `HANDOVER-MANIFEST.json`, listing the SHA-256 hash and size of every packaged source/documentation file. The builder checks that staff workbooks and runtime indexes are excluded.

Transfer staff data separately when required; see [DATA-STORAGE.md](DATA-STORAGE.md).

## Backup and recovery

Each installer run creates a timestamped backup under `backups/local/install-*`. Previous feature-change backups are grouped under `backups/local/change-history/`. `backups/local/source-snapshots/source-layout-*` records the application before the folder reorganization, and `backups/local/installer-tests/` contains temporary-install checks.

If installation fails, the installer leaves web access disabled and prints the backup location. Fix the reported issue and rerun the installer, or restore the matching application code from that backup with Apache stopped. Restore the original `.htaccess` after the code is in place.

For a code rollback, preserve the current `storage/` folder. A data restore is a separate operation and would replace newer workbook/index/selection changes. Keep workbook files, their `library.json` and their `selected-workbook.json` together when restoring a workspace.

## Project history

Original Git history remains at the project root in `.git`. The former flat application and its tests are preserved together under `archive/previous-version/original-flat-layout-20261122-135236`, with checksums in `ORIGINAL-FILES.json`. Use the current checks, installer and release builder in `scripts/`.
