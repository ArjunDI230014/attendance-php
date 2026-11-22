<?php
// Keep existing upload bookmarks and clients working through the combined library.
declare(strict_types=1);
require_once __DIR__ . '/includes/layout/page-shell.php';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Location: ' . workspaceUrl('files.php') . '#upload-workbook', true, 303);
    exit;
}
require __DIR__ . '/includes/pages/file-page.php';
