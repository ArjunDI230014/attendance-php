<?php
declare(strict_types=1);

const ATTENDANCE_WORKSPACES = ['marketplace' => 'Marketplace', 'food' => 'Food'];

function workspaceKey(): ?string
{
    $query = $_GET['workspace'] ?? null;
    $form = $_POST['workspace'] ?? null;
    foreach ([$query, $form] as $value) {
        if ($value !== null && (!is_string($value) || !isset(ATTENDANCE_WORKSPACES[$value]))) {
            throw new InvalidArgumentException('Choose Marketplace or Food from the main page.');
        }
    }
    if ($query !== null && $form !== null && $query !== $form) {
        throw new InvalidArgumentException('The submitted section does not match this page. Refresh and try again.');
    }
    return $query ?? $form;
}

function workspaceRequire(bool $json = false): string
{
    try {
        $key = workspaceKey();
        if ($key !== null) return $key;
        if (!$json && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
            header('Location: index.php', true, 303);
            exit;
        }
        throw new InvalidArgumentException('Choose Marketplace or Food before using this page.');
    } catch (InvalidArgumentException $error) {
        http_response_code(400);
        header('Cache-Control: no-store');
        header('Content-Type: ' . ($json ? 'application/json' : 'text/html') . '; charset=utf-8');
        echo $json ? json_encode(['error' => $error->getMessage()])
            : '<!doctype html><html lang="en"><meta charset="utf-8"><title>Choose a section</title><p>'
                . htmlspecialchars($error->getMessage(), ENT_QUOTES, 'UTF-8') . '</p><a href="index.php">Choose a section</a></html>';
        exit;
    }
}

function workspaceLabel(): string
{
    return ATTENDANCE_WORKSPACES[workspaceRequire()];
}

function workspaceUrl(string $path): string
{
    return $path . (str_contains($path, '?') ? '&' : '?') . 'workspace=' . workspaceRequire();
}

function workspaceField(): string
{
    return '<input type="hidden" name="workspace" value="' . workspaceRequire() . '">';
}
