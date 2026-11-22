<?php
declare(strict_types=1);
require_once __DIR__ . '/page-shell.php';
$token = libraryToken();
$error = null;
$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : '';
    $result = libraryRequest('POST', 'upload', [], $_FILES['workbook'] ?? null, $csrf);
    if ($result['status'] === 201) {
        $file = $result['body']['file'];
        $redirect = 'files.php';
        if (($_POST['mode'] ?? 'open') === 'open') {
            $workbook = libraryRequest('GET', 'workbook', ['id' => $file['id']]);
            if ($workbook['status'] === 200) {
                librarySelect($file['id']);
                libraryFlash('Uploaded ' . $file['name'] . ' and opened it in the dashboard.');
                $redirect = 'index.php';
            } else {
                libraryFlash('The file was saved, but could not be loaded into the dashboard: ' . $workbook['body']['error'], true);
            }
        } else {
            libraryFlash('Uploaded ' . $file['name'] . ' to Excel files.');
        }
        if ($wantsJson) {
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
            http_response_code(201);
            echo json_encode(['redirect' => $redirect, 'file' => $file], JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
            exit;
        }
        header('Location: ' . $redirect, true, 303);
        exit;
    }
    http_response_code($result['status']);
    $error = $result['body']['error'];
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['error' => $error], JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
}
pageStart('upload', 'Upload Excel workbook', 'Choose an Excel workbook to upload and open in your dashboard.');
if ($error) pageNotice($error, true);
?>
<section class="panel upload-page">
    <div class="library-upload-icon" aria-hidden="true">↥</div>
    <h2>Add a workbook to your library</h2>
    <p>The original file is saved locally. You can download, rename, archive or delete it later.</p>
    <form method="post" action="upload-workbook.php" enctype="multipart/form-data" class="native-upload-form" id="workbook-upload-form">
        <?= pageCsrf($token) ?>
        <input type="hidden" name="MAX_FILE_SIZE" value="31457280">
        <label for="upload-mode">After uploading</label>
        <select id="upload-mode" name="mode"><option value="open">Open in dashboard</option><option value="save">Save to Excel files only</option></select>
        <label for="workbook">Excel workbook (.xlsx)</label>
        <input type="file" id="workbook" name="workbook" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required aria-describedby="upload-help">
        <p id="upload-help">Up to 30 MB per file. Choose a workbook and the upload starts automatically. You can also use the button below.</p>
        <div id="upload-status" role="status" aria-live="polite"></div>
        <div class="native-form-actions"><button type="submit" class="button primary" id="upload-submit">Upload &amp; open workbook</button><a class="button secondary" href="files.php">Back to Excel files</a></div>
        <noscript><p>Select your workbook, then click the upload button to continue.</p></noscript>
    </form>
    <div class="notice"><h3>Attendance workbooks</h3><p>Files used in the dashboard need Date, Name, Reporting Ref, Actual, and the five scheduled/actual count columns. Other valid .xlsx workbooks can also be kept in the library.</p></div>
</section>
<script type="module" src="upload-form.mjs"></script>
<?php pageEnd(); ?>
