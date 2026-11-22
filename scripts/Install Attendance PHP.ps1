param([string]$TargetDirectory = 'C:\xampp\htdocs\attendance_php')
$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$sourceDirectory = Join-Path $workspaceRoot 'app'
$target = [IO.Path]::GetFullPath($TargetDirectory).TrimEnd('\')
if ($target -eq [IO.Path]::GetPathRoot($target).TrimEnd('\') -or $target -eq 'C:\xampp\htdocs') { throw 'Choose an application folder, not a drive or the shared web root.' }
if (!(Test-Path -LiteralPath (Join-Path $sourceDirectory 'includes\core\library-store.php'))) { throw 'Current application source is missing.' }
$existed = Test-Path -LiteralPath $target
if ($existed) {
    $recognized = (Test-Path -LiteralPath (Join-Path $target 'library-store.php')) -or (Test-Path -LiteralPath (Join-Path $target 'includes\library-store.php')) -or (Test-Path -LiteralPath (Join-Path $target 'includes\core\library-store.php'))
    if (!$recognized -and @(Get-ChildItem -LiteralPath $target -Force).Count -gt 0) { throw 'The destination contains another project. No files were changed.' }
}
$storage = Join-Path $target 'storage'
$legacyIndex = Join-Path $storage 'library.json'
$foodIndex = Join-Path $storage 'food\library.json'
if ((Test-Path -LiteralPath $legacyIndex) -and (Test-Path -LiteralPath $foodIndex)) { throw 'Both legacy and Food indexes exist. Reconcile them before installing.' }
$backup = Join-Path $workspaceRoot ('backups\local\install-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$version = (Get-Content -LiteralPath (Join-Path $workspaceRoot 'package.json') -Raw | ConvertFrom-Json).version
@{ target = $target; source = $sourceDirectory; version = $version; createdAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backup 'installation.json') -Encoding utf8
New-Item -ItemType Directory -Path $target -Force | Out-Null
$accessRule = Join-Path $target '.htaccess'
if (Test-Path -LiteralPath $accessRule) { Copy-Item -LiteralPath $accessRule -Destination (Join-Path $backup '.htaccess') }
Set-Content -LiteralPath $accessRule -Value 'Require all denied' -Encoding ascii
$locks = @()
$completed = $false
try {
    # New requests are paused. Wait for existing file operations before taking the backup.
    foreach ($folder in @($storage, (Join-Path $storage 'food'), (Join-Path $storage 'marketplace'))) {
        if (!(Test-Path -LiteralPath $folder)) { continue }
        $held = $null
        for ($attempt = 0; $attempt -lt 100; $attempt++) {
            try { $held = [IO.File]::Open((Join-Path $folder 'library.lock'), 'OpenOrCreate', 'ReadWrite', 'None'); break }
            catch [IO.IOException] { Start-Sleep -Milliseconds 100 }
        }
        if ($null -eq $held) { throw 'Workbook storage is busy. Retry the installer.' }
        $locks += $held
    }
    foreach ($file in Get-ChildItem -LiteralPath $target -File -Recurse -Force) {
        $relative = $file.FullName.Substring($target.Length).TrimStart('\')
        if ($relative -eq '.htaccess' -or $file.Name -eq 'library.lock') { continue }
        $copy = Join-Path $backup $relative
        New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($copy)) -Force | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $copy -Force
        if ((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath $copy).Hash) { throw ('Backup verification failed: ' + $relative) }
    }
    $data = @{}
    if (Test-Path -LiteralPath $storage) {
        foreach ($file in Get-ChildItem -LiteralPath $storage -File -Recurse -Force | Where-Object { $_.Name -notin @('.htaccess','library.lock') }) { $data[$file.FullName] = (Get-FileHash -LiteralPath $file.FullName).Hash }
    }
    $sourceFiles = @(Get-ChildItem -LiteralPath $sourceDirectory -File -Recurse -Force | Where-Object {
        $relative = $_.FullName.Substring($sourceDirectory.Length).TrimStart('\')
        $relative -eq 'storage\.htaccess' -or !$relative.StartsWith('storage\', [StringComparison]::OrdinalIgnoreCase)
    })
    foreach ($file in $sourceFiles) {
        $relative = $file.FullName.Substring($sourceDirectory.Length).TrimStart('\')
        if ($relative -eq '.htaccess') { continue }
        $copy = Join-Path $target $relative
        New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($copy)) -Force | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $copy -Force
        if ((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath $copy).Hash) { throw ('Installed file mismatch: ' + $relative) }
    }
    foreach ($section in @('food','marketplace')) { New-Item -ItemType Directory -Path (Join-Path $storage $section) -Force | Out-Null }
    if (Test-Path -LiteralPath $legacyIndex) {
        $entries = @(Get-Content -LiteralPath $legacyIndex -Raw | ConvertFrom-Json)
        foreach ($entry in $entries) {
            if ($entry.id -notmatch '^[a-f0-9]{32}$') { throw 'Invalid legacy workbook ID.' }
            $oldFile = Join-Path $storage ($entry.id + '.xlsx')
            $newFile = Join-Path $storage ('food\' + $entry.id + '.xlsx')
            Copy-Item -LiteralPath $oldFile -Destination $newFile -Force
            if ((Get-FileHash -LiteralPath $oldFile).Hash -ne (Get-FileHash -LiteralPath $newFile).Hash) { throw 'Legacy workbook verification failed.' }
        }
        Copy-Item -LiteralPath $legacyIndex -Destination $foodIndex -Force
        $retired = Join-Path $backup 'retired-legacy'
        New-Item -ItemType Directory -Path $retired -Force | Out-Null
        foreach ($entry in $entries) { Move-Item -LiteralPath (Join-Path $storage ($entry.id + '.xlsx')) -Destination $retired }
        Move-Item -LiteralPath $legacyIndex -Destination $retired
    } else {
        foreach ($file in $data.Keys) {
            if (!(Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file).Hash -ne $data[$file]) { throw ('Stored workbook or index changed unexpectedly: ' + $file) }
        }
    }
    # Retire only known old application files; never move the storage directories.
    $oldNames = @($sourceFiles | ForEach-Object Name | Sort-Object -Unique) + @('README.md','data.js','file-library.mjs','xlsx-reader.mjs')
    $retiredFlat = Join-Path $backup 'retired-flat-files'
    foreach ($name in $oldNames) {
        if ($name.StartsWith('.')) { continue }
        $oldFile = [IO.Path]::GetFullPath((Join-Path $target $name))
        if (!(Test-Path -LiteralPath $oldFile -PathType Leaf) -or (Test-Path -LiteralPath (Join-Path $sourceDirectory $name))) { continue }
        if (![String]::Equals([IO.Path]::GetDirectoryName($oldFile), $target, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected retirement path.' }
        New-Item -ItemType Directory -Path $retiredFlat -Force | Out-Null
        Move-Item -LiteralPath $oldFile -Destination (Join-Path $retiredFlat $name)
    }
    # Retire the previous ungrouped assets/includes after their replacements are verified.
    foreach ($relativeFolder in @('assets\js','assets\css','includes')) {
        $oldFolder = [IO.Path]::GetFullPath((Join-Path $target $relativeFolder))
        foreach ($file in Get-ChildItem -LiteralPath $oldFolder -File -Force) {
            if ($file.Name.StartsWith('.') -or $file.Name -notin $oldNames) { continue }
            $relative = Join-Path $relativeFolder $file.Name
            if (Test-Path -LiteralPath (Join-Path $sourceDirectory $relative)) { continue }
            if (![String]::Equals([IO.Path]::GetDirectoryName($file.FullName), $oldFolder, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected grouped-file retirement path.' }
            $retired = Join-Path $backup ('retired-layout\' + $relative)
            New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($retired)) -Force | Out-Null
            Move-Item -LiteralPath $file.FullName -Destination $retired
        }
    }
    Set-Content -LiteralPath (Join-Path $target '.summitnext-install') -Value 'SummitNext Attendance local installation' -Encoding ascii
    $completed = $true
} finally {
    foreach ($held in $locks) { $held.Dispose() }
    if ($completed) {
        $configuration = Get-Content -LiteralPath (Join-Path $sourceDirectory '.htaccess') -Raw
        $webRoot = 'C:\xampp\htdocs'
        if ($target.StartsWith($webRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
            $webPath = '/' + $target.Substring($webRoot.Length + 1).Replace('\','/') + '/'
            $configuration = $configuration.Replace('RewriteBase /attendance_php/', 'RewriteBase ' + $webPath)
        }
        Set-Content -LiteralPath $accessRule -Value $configuration -Encoding ascii
    }
    else { Write-Warning ('Installation stopped. Web access remains disabled. Verified backup: ' + $backup) }
}
Write-Output ('Installed and verified ' + $sourceFiles.Count + ' application files.')
Write-Output ('Backup: ' + $backup)
Write-Output ('Target: ' + $target)
Write-Output 'Workbook storage, indexes and saved selections were preserved.'
