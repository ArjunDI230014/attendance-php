<?php
declare(strict_types=1);
require_once __DIR__ . '/../layout/page-shell.php';
$uploadError = null;
$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : '';
    $result = libraryRequest('POST', 'upload', [], $_FILES['workbook'] ?? null, $csrf);
    if ($result['status'] === 201) {
        $file = $result['body']['file'];
        $redirect = workspaceUrl('files.php');
        if (($_POST['mode'] ?? 'save') === 'open') {
            $workbook = libraryRequest('POST', 'select', ['id' => $file['id']], null, $csrf);
            if ($workbook['status'] === 200) {
                libraryFlash('Uploaded ' . $file['name'] . ' and opened it in the dashboard.');
                $redirect = workspaceUrl('overview.php');
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
    $uploadError = $result['body']['error'];
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['error' => $uploadError], JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
}
