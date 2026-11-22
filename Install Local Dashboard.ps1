$ErrorActionPreference = 'Stop'

$destination = 'C:\xampp\htdocs\attendance_php'
$dashboardUrl = 'http://localhost/attendance_php/'
$files = @(
    '.htaccess', '.user.ini', 'index.php', 'index.html',
    'people.php', 'files.php', 'archive.php', 'upload-workbook.php',
    'edit-workbook.php', 'file-action.php', 'page-shell.php', 'file-page.php', 'dashboard-page.php',
    'library-store.php', 'upload.php', 'workbook-reader.php', 'file-library.php',
    'styles.css', 'agent-details.css', 'file-library.css', 'pages.css',
    'app.mjs', 'model.mjs', 'agent-details.mjs', 'upload-form.mjs', 'storage\.htaccess'
)

if (-not (Test-Path -LiteralPath 'C:\xampp\htdocs' -PathType Container)) {
    throw 'XAMPP was not found at C:\xampp. Install XAMPP there before running this script.'
}

foreach ($file in $files) {
    $source = Join-Path $PSScriptRoot $file
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Missing dashboard file: $source"
    }
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach ($file in $files) {
    $source = Join-Path $PSScriptRoot $file
    $target = Join-Path $destination $file
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
    if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) {
        throw "Installed file does not match the source: $file"
    }
}

Write-Output "Installed and verified $($files.Count) dashboard files in $destination"
try {
    $response = Invoke-WebRequest -Uri $dashboardUrl -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -ne 200 -or $response.Content -notmatch 'window.SFSN_PAGE') {
        throw 'The dashboard did not return its PHP page configuration.'
    }
    Write-Output "Dashboard ready: $dashboardUrl"
} catch {
    Write-Warning "Files installed. Start Apache in the XAMPP Control Panel, then open $dashboardUrl. Check: $($_.Exception.Message)"
}
