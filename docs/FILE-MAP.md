# File map

## Public pages and endpoints

These PHP files remain at the application root so existing bookmarks keep working.

| File | Purpose |
| --- | --- |
| `app/index.php` | Marketplace/Food selection |
| `app/overview.php` | Attendance overview |
| `app/people.php` | Staff attendance and follow-up actions |
| `app/files.php` | Combined Excel library and upload page |
| `app/archive.php` | Archived workbooks |
| `app/file-library.php` | JSON file API and downloads |
| `app/file-action.php` | Form actions such as selecting, renaming and archiving |
| `app/edit-workbook.php` | Rename/delete fallback for browsers without dialogs |
| `app/upload-workbook.php` | Compatibility route to the combined Excel page |
| `app/upload.php` | Retired upload endpoint; directs clients to the current flow |

## Find a change

| Change | Start here |
| --- | --- |
| Brand name, navigation, shared header/footer | `app/includes/layout/page-shell.php` |
| Marketplace/Food selection cards | `app/views/home.php` |
| Overview and staff HTML | `app/views/dashboard.html` |
| Dashboard page state and workbook bootstrap | `app/includes/pages/dashboard-page.php` |
| File list, archive list and popup markup | `app/includes/pages/file-page.php` |
| Upload form markup | `app/views/upload-panel.php` |
| Upload handling and selection after upload | `app/includes/pages/upload-handler.php` |
| File storage, active workbook and file operations | `app/includes/core/library-store.php` |
| Workspace validation and scoped links | `app/includes/core/workspace.php` |
| Excel parsing | `app/includes/core/workbook-reader.php` |
| Attendance formulas and normalization | `app/assets/js/dashboard/model.mjs` |
| Dashboard charts, filters, tables and actions | `app/assets/js/dashboard/app.mjs` |
| Individual staff profiles | `app/assets/js/dashboard/agent-details.mjs` |
| Page changes, history, stale-request cancellation | `app/assets/js/navigation/navigation.mjs` |
| Delayed progress indicator | `app/assets/js/navigation/page-loading.mjs` and `app/assets/css/navigation/page-loading.css` |
| Rename/Delete popup behavior | `app/assets/js/files/file-dialogs.mjs` |
| Automatic upload and progress/error messages | `app/assets/js/files/upload-form.mjs` |
| Theme button and shared theme assets | `app/includes/layout/theme.php` |
| Saved theme before first paint | `app/assets/js/theme/theme-init.js` |
| Circular light/dark reveal | `app/assets/js/theme/theme.mjs` |
| Dark palette | `app/assets/css/theme/theme.css` |
| Base layout and dashboard styles | `app/assets/css/shared/styles.css` |
| Page layout, upload panel and workspace cards | `app/assets/css/shared/pages.css` |
| File tables and popup styles | `app/assets/css/files/file-library.css` |
| Staff profile styles | `app/assets/css/dashboard/agent-details.css` |
| Initial page mounting | `app/assets/js/dashboard/dashboard-entry.mjs`, `app/assets/js/files/file-page-entry.mjs` |
| Deployment and old-file retirement | `scripts/Install Attendance PHP.ps1` |
| Source-only handover ZIP | `scripts/build-release.mjs` |

`app/assets/vendor/` contains bundled JSZip and its license. The package builder and synthetic-workbook tests use it.

## Search

From the project root:

```powershell
rg -n 'initializeDashboard' app tests
rg -n 'librarySelect|selected-workbook' app/includes tests
rg -n 'workspace' app/includes app/assets/js
```

The root `.ignore` keeps archives, backups, generated releases and the minified vendor bundle out of default text searches. Open those folders directly when researching historical work.
