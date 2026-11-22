<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/core/workspace.php';
workspaceRequire(true);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
http_response_code(410);
echo json_encode(['error' => 'Use Upload workbook in your selected workspace to save attendance files.']);
