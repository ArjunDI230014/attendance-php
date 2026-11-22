<?php
declare(strict_types=1);
require_once __DIR__ . '/library-store.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Content-Type: application/json; charset=utf-8');
$method = $_SERVER['REQUEST_METHOD'];
$values = $method === 'GET' ? $_GET : $_POST;
$action = $values['action'] ?? ($method === 'GET' ? 'list' : '');
if (!is_string($action)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file action.']);
    exit;
}
$result = libraryRequest($method, $action, $values, $_FILES['workbook'] ?? null, $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
http_response_code($result['status']);
echo json_encode($result['body'], JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
