# Data storage

## Live files

The default installed data directory is `C:\xampp\htdocs\attendance_php\storage`.

```text
storage/
  .htaccess                   # denies direct web access
  food/
    library.json              # workbook metadata and archive status
    selected-workbook.json    # remembered selection: {"id": "..."} or {"id": null}
    <32-character-id>.xlsx    # stored workbook
    library.lock              # transient file-operation lock
  marketplace/
    library.json
    selected-workbook.json
    <32-character-id>.xlsx
    library.lock
```

Each library entry records `id`, `name`, `size`, `uploadedAt`, `archivedAt` and worksheet names. The ID maps to the workbook filename in that same workspace. Food and Marketplace are resolved independently on every request.

The source folder `app/storage/` ships only its access rule. The installer excludes runtime files from source copying and preserves the installed libraries and selections.

## Browser and session state

- The selected workbook is saved on disk per workspace and survives browser sessions and Apache restarts.
- Follow-up actions and metric settings are stored in the current browser, separated by installation path and workspace. Use Export actions and Import actions to transfer them. Action backups are restricted to the workspace that exported them.
- Theme preference is stored in the browser for the installation and applies across both workspaces.
- CSRF tokens and transient notices use PHP sessions.

## Data transfer

Stop Apache before taking a consistent manual storage copy. Transfer the complete workspace directory, including its workbook files, `library.json` and `selected-workbook.json`. Preserve the parent `storage/.htaccess` rule. The lock file can be recreated by the application.

Copying Excel files alone does not rebuild the library index. Browser-only follow-up actions require their own JSON export/import. The source handover ZIP contains no staff data, runtime indexes or installation backups.

## Historical files

`archive/previous-version/` contains original attendance snapshots and generated reports from earlier work. `backups/local/` may include stored workbooks from previous installations. Both remain local and are excluded from release packaging and default project searches.
