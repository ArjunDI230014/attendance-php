# SFSN Attendance Operations — HTML + PHP

Upload an Excel `.xlsx` workbook using **Import workbook**. The dashboard shows the same overview, attendance and shrinkage KPIs, monthly/team/weekday charts, staff register, agent leave profiles, filters and CSV exports as the original version.

## Run with XAMPP

1. Run `powershell -ExecutionPolicy Bypass -File ".\Install Local Dashboard.ps1"` from this project folder. This copies the dashboard into `C:\xampp\htdocs\attendance_php` and verifies the installed files. Run it again after editing the source files to refresh the local installation.
2. Start **Apache** in the XAMPP Control Panel.
3. Open **http://localhost/attendance_php/** and click **Import workbook** to select an `.xlsx` file.

Open the URL through Apache so `index.php` runs. Double-clicking a PHP file cannot run the server. No Node.js, database, Composer install or Internet connection is needed.

## Requirements

- PHP 8.1 or newer, with `zip`, `dom`, `xmlreader` and `mbstring` enabled. The installed XAMPP PHP 8.2 supports these requirements.
- A modern browser with JavaScript enabled for the interactive dashboard.
- Maximum upload: 30 MB. The included Apache configuration sets `upload_max_filesize=30M`, `post_max_size=32M`, `memory_limit=256M` and `max_execution_time=120`. PHP FastCGI reads the same settings from `.user.ini`. Restart Apache if configuration changes do not take effect.
- The Excel attendance table must include Date, Name, Reporting Ref, Actual and the five scheduled/actual count columns used by the original workbook. Excel formulas must have saved numeric results: open and save the workbook in Excel before uploading if results are missing. Older `.xls` files must first be saved as `.xlsx`.

## Data behavior

The original snapshot appears when the page opens. An upload replaces the displayed data for the current page session. Reloading returns to the original snapshot, as in the existing dashboard. PHP reads the uploaded workbook from a temporary file and does not retain a permanent copy or edit the Excel source. Follow-up actions and metric settings remain in the current browser; actions can be exported/imported as JSON.

`index.php` serves the existing HTML interface. `upload.php` receives the Excel file and `workbook-reader.php` extracts its saved values. The existing `model.mjs` still performs all attendance calculations, so both versions use the same rules. Invalid uploads display an error and preserve the current dashboard.

The supplied `.htaccess` keeps this installation accessible only from the same computer, matching the existing local setup.

## Files and checks

`index.html` remains available as the static browser version, with Excel parsing in the browser. `index.php` uses PHP for uploads. Both use the bundled CSS and JavaScript assets and the JSZip license is included.

From the source project, run `node test-model.mjs`, `node test-agent-details.mjs` and `node test-php-upload.mjs`. Run `node ../test-interface.mjs` from the project folder for interface logic checks. Pass the original workbook path to `test-php-upload.mjs` to compare every imported record with the current snapshot. Set `PHP_BINARY` to the PHP executable path when it is not on PATH.
