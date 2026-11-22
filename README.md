# SFSN Attendance Operations — PHP

A local attendance dashboard with separate pages for the overview, staff register, Excel file library, uploads, archive, and file confirmation forms.

## Run with XAMPP

1. Run `powershell -ExecutionPolicy Bypass -File ".\Install Local Dashboard.ps1"` from this folder. It installs the application in `C:\xampp\htdocs\attendance_php` and verifies the copied files. Run it again after editing source files. Existing stored workbooks are preserved.
2. Start Apache in the XAMPP Control Panel.
3. Open **http://localhost/attendance_php/**.

PHP 8.1 or newer is required, with `zip`, `dom`, `xmlreader`, and `mbstring` enabled. The installed XAMPP PHP 8.2 supports these requirements. No database, Composer, Node server, or internet connection is required to run the app.

## Pages

- **Overview:** `index.php` — attendance KPIs and charts for the selected workbook.
- **Staff attendance:** `people.php` — staff register, leave details, and browser-saved action tracker.
- **Excel files:** `files.php` — active saved workbooks, search, sorting, download, rename, selection, and archive actions.
- **Upload workbook:** `upload-workbook.php` — a standard HTML multipart form with a visible file input. Selecting a file starts upload automatically; an explicit upload button also works. The form still submits normally when JavaScript is disabled.
- **Archive:** `archive.php` — archived workbooks, downloads, restore, and links to permanent-deletion confirmation.
- **Rename / delete confirmation:** `edit-workbook.php` — separate forms for naming and destructive-action confirmation.

Use the actual PHP URLs through Apache. The `index.html` file is a dashboard template; opening it directly is not the supported application entry point. Old `#files` links redirect to the new file library.

## Upload and select a workbook

1. Open **Upload workbook**.
2. Leave **After uploading** set to **Open in dashboard**, then choose one `.xlsx` workbook of up to 30 MB. Upload starts automatically. If JavaScript is disabled, click **Upload & open workbook**.
3. The app saves the file, selects it, and opens the dashboard automatically.
4. Choose **Save to Excel files only** before selecting a file to store it without changing the current dashboard. Non-attendance workbooks are saved with a visible explanation when they cannot be opened.

The dashboard starts empty. The chosen workbook remains selected in the current browser session when refreshing or moving between Overview and Staff attendance. **Clear dashboard** removes the current selection without deleting its saved file. Archiving or deleting that workbook clears the selection. No sample or bundled attendance data is loaded.

Other valid `.xlsx` files can be kept in the library, but dashboard workbooks need Date, Name, Reporting Ref, Actual, and all five scheduled/actual count columns. Formula cells must have cached numeric results: open and save in Excel if necessary. Save older `.xls` files as `.xlsx` before uploading.

Each upload is stored separately, including duplicate file names. Renaming changes its library/download name without changing the workbook contents. Archived files remain saved and downloadable; restore them to use them again. Permanent deletion is available only after archiving and requires a separate confirmation form.

## Storage and privacy

Files and metadata live in `C:\xampp\htdocs\attendance_php\storage`. Back up this entire folder to back up the library. Apache blocks direct access; downloads use a controlled PHP endpoint. `.htaccess` restricts the app to this computer. The old `data.js` snapshot is blocked and is not loaded.

Files are shared between browsers on this computer. The selected workbook is saved in a PHP browser session. Follow-up actions and metric settings stay in each browser's local storage; export/import actions as JSON to transfer them.

Upload limits are configured in `.htaccess` for Apache mod_php and `.user.ini` for FastCGI: 30 MB files, 32 MB POST bodies, 256 MB memory, and a 120-second execution limit. Restart Apache if configuration changes do not take effect.

## Validation

After installing and starting Apache:

- `node tests/file-library.mjs` checks the file API, parsing, invalid requests, download, rename, archive/restore, permanent deletion, and storage access protection.
- `node tests/native-pages.mjs` checks the HTML forms, redirects, selection across pages and refresh, validation errors, and file-management flow without JavaScript.

Checks generate synthetic Excel workbooks and remove only the test uploads they create. Set `PHP_BINARY` to override the default XAMPP PHP executable and `DASHBOARD_URL` to override the local URL.
