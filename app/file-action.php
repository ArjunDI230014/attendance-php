<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/layout/page-shell.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    pageStart('files', 'Choose a file action', 'Use the controls on the Excel files page.');
    pageEnd();
    exit;
}
$action = is_string($_POST['action'] ?? null) ? $_POST['action'] : '';
$id = is_string($_POST['id'] ?? null) ? $_POST['id'] : '';
$csrf = is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : '';
$return = ($_POST['return'] ?? '') === 'archive' ? 'archive.php' : 'files.php';
if (!hash_equals(libraryToken(), $csrf) || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
    http_response_code(403);
    pageStart('files', 'File action not completed', 'Refresh the file library and try again.');
    pageNotice('Your file library session expired or this action came from another site.', true);
    pageEnd();
    exit;
}
if ($action === 'use') {
    $result = libraryRequest('POST', 'select', ['id' => $id], null, $csrf);
    if ($result['status'] === 200) {
        header('Location: ' . workspaceUrl('overview.php'), true, 303);
        exit;
    }
} elseif ($action === 'unload') {
    librarySelect(null);
    header('Location: ' . workspaceUrl('overview.php'), true, 303);
    exit;
} elseif (in_array($action, ['rename', 'archive', 'restore', 'delete'], true)) {
    $result = libraryRequest('POST', $action, ['id' => $id, 'name' => $_POST['name'] ?? ''], null, $csrf);
    if ($result['status'] === 200) {
        libraryFlash(match ($action) {
            'rename' => 'Workbook renamed.', 'archive' => 'Workbook archived. You can restore it from the Archive page.',
            'restore' => 'Workbook restored to Excel files.', 'delete' => 'Workbook permanently deleted.',
        });
        header('Location: ' . workspaceUrl($return), true, 303);
        exit;
    }
} else {
    $result = ['status' => 400, 'body' => ['error' => 'Unknown file action.']];
}
http_response_code($result['status']);
pageStart('files', 'File action not completed', 'Your stored workbooks are still available in the library.');
pageNotice($result['body']['error'], true);
echo '<a class="button secondary" href="' . pageEscape(workspaceUrl($return)) . '">Back to library</a>';
pageEnd();
