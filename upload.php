<?php
declare(strict_types=1);

require_once __DIR__ . '/workbook-reader.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Choose an Excel workbook using Import workbook.']);
}
if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
    respond(403, ['error' => 'Upload the workbook from this dashboard.']);
}
if (!isset($_FILES['workbook'])) {
    respond(400, ['error' => 'No workbook received. The server upload limit may have been exceeded. Ask your server administrator to set upload_max_filesize to 30M and post_max_size to 32M.']);
}
$file = $_FILES['workbook'];
if (!is_int($file['error'] ?? null)) {
    respond(400, ['error' => 'Upload one .xlsx workbook at a time.']);
}
if ($file['error'] !== UPLOAD_ERR_OK) {
    $messages = [
        UPLOAD_ERR_INI_SIZE => 'The workbook exceeds the PHP upload limit. Set upload_max_filesize to 30M and post_max_size to 32M.',
        UPLOAD_ERR_FORM_SIZE => 'The workbook exceeds the upload size limit.',
        UPLOAD_ERR_PARTIAL => 'The upload was interrupted. Please try again.',
        UPLOAD_ERR_NO_FILE => 'Choose an .xlsx workbook first.',
    ];
    respond(400, ['error' => $messages[$file['error']] ?? 'The server could not receive the workbook. Check its temporary upload folder.']);
}
if (!is_uploaded_file($file['tmp_name'])) {
    respond(400, ['error' => 'The workbook upload is not valid.']);
}
$name = basename(str_replace('\\', '/', $file['name']));
if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'xlsx') {
    respond(400, ['error' => 'Upload an .xlsx Excel workbook. Save older .xls files as .xlsx first.']);
}
if ($file['size'] > 30 * 1024 * 1024) {
    respond(413, ['error' => 'The file is over 30 MB. Use a smaller master workbook.']);
}
try {
    $workbook = readAttendanceWorkbook($file['tmp_name'], $name);
    respond(200, ['workbook' => $workbook]);
} catch (InvalidArgumentException $e) {
    respond(422, ['error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('Attendance workbook upload: ' . $e->getMessage());
    respond(500, ['error' => 'The server could not read the workbook. Check that the PHP zip, dom, xmlreader and mbstring extensions are enabled.']);
}
// PHP removes its temporary upload automatically at the end of the request.
