<?php
declare(strict_types=1);
require_once __DIR__ . '/library-store.php';

function pageEscape(mixed $text): string
{
    return htmlspecialchars((string) $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function pageNavigation(string $active): string
{
    $links = [
        'overview' => ['index.php', '◫', 'Overview'],
        'people' => ['people.php', '♙', 'Staff attendance'],
        'files' => ['files.php', '▤', 'Excel files'],
        'upload' => ['upload-workbook.php', '↥', 'Upload workbook'],
        'archive' => ['archive.php', '▣', 'Archive'],
    ];
    $html = '<nav aria-label="Main navigation">';
    foreach ($links as $key => [$url, $icon, $label]) {
        $html .= '<a href="' . $url . '"' . ($key === $active ? ' class="active" aria-current="page"' : '')
            . '><span aria-hidden="true">' . $icon . '</span>' . $label . '</a>';
    }
    return $html . '</nav>';
}

function pageStart(string $active, string $title, string $subtitle): void
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    $flash = libraryFlash();
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>' . pageEscape($title) . ' · SFSN Attendance</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="file-library.css"><link rel="stylesheet" href="pages.css"></head><body>'
        . '<aside class="sidebar"><a class="brand" href="index.php"><span class="brand-icon">s.</span><span>SFSN<small>OPERATIONS INTELLIGENCE</small></span></a><div class="nav-label">WORKSPACE</div>'
        . pageNavigation($active) . '<div class="side-bottom"><div class="live-dot"></div> Local workbook library<p>Analyse attendance.<br>Plan your next move.</p><small>Private attendance information</small></div></aside>'
        . '<div class="shell"><header class="topbar"><div>Operations <span>/</span> <b>Attendance</b></div><div class="top-right"><span class="local-tag">● Local workbook library</span><span class="avatar">OM</span></div></header><main>'
        . '<div class="heading"><div><div class="eyebrow">WORKFORCE PERFORMANCE</div><h1>' . pageEscape($title) . '</h1><p>' . pageEscape($subtitle) . '</p></div></div>';
    if ($flash) pageNotice($flash['message'], $flash['error']);
}

function pageNotice(string $message, bool $error = false): void
{
    echo '<div class="library-notice' . ($error ? ' is-error' : '') . '" role="' . ($error ? 'alert' : 'status') . '">' . pageEscape($message) . '</div>';
}

function pageEnd(): void
{
    echo '<footer><span>SFSN / Attendance Operations</span><span>Excel files are stored on this computer.</span></footer></main></div></body></html>';
}

function pageCsrf(string $token): string
{
    return '<input type="hidden" name="csrf" value="' . pageEscape($token) . '">';
}

function pageAction(string $action, string $id, string $label, string $token, string $return = 'files', string $class = 'text-button'): string
{
    return '<form method="post" action="file-action.php" class="inline-form">' . pageCsrf($token)
        . '<input type="hidden" name="action" value="' . pageEscape($action) . '"><input type="hidden" name="id" value="' . pageEscape($id)
        . '"><input type="hidden" name="return" value="' . pageEscape($return) . '"><button type="submit" class="' . pageEscape($class) . '">' . pageEscape($label) . '</button></form>';
}

function pageDate(string $date): string
{
    return (new DateTimeImmutable($date))->setTimezone(new DateTimeZone('Asia/Kuala_Lumpur'))->format('d M Y, g:i a');
}

function pageBytes(int $bytes): string
{
    return $bytes < 1048576 ? number_format($bytes / 1024, 1) . ' KB' : number_format($bytes / 1048576, 1) . ' MB';
}
