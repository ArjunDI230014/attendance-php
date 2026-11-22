<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/core/workspace.php';
if (isset($_GET['workspace']) || isset($_POST['workspace'])) {
    workspaceRequire();
    header('Location: ' . workspaceUrl('overview.php'), true, 303);
    exit;
}
require __DIR__ . '/views/home.php';
