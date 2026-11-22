<?php
declare(strict_types=1);
require_once __DIR__ . '/page-shell.php';
$dashboardPage = $dashboardPage ?? 'overview';
$raw = null;
$loadError = null;
$selected = libraryActive();
if ($selected !== null) {
    $result = libraryRequest('GET', 'workbook', ['id' => $selected]);
    if ($result['status'] === 200) {
        $raw = $result['body']['workbook'];
    } else {
        librarySelect(null);
        $loadError = $result['body']['error'];
    }
}
$token = libraryToken();
$flash = libraryFlash();
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$html = file_get_contents(__DIR__ . '/index.html');
$html = preg_replace('/<nav aria-label="Main navigation">.*?<\/nav>/s', pageNavigation($dashboardPage), $html, 1);
$html = str_replace('href="#overview"', 'href="index.php"', $html);
$html = str_replace('● Browser workspace', '● Local workbook library', $html);
$html = str_replace('<link rel="stylesheet" href="file-library.css">', '<link rel="stylesheet" href="file-library.css"><link rel="stylesheet" href="pages.css">', $html);
$html = preg_replace('/<label class="button primary" for="upload".*?<input id="upload"[^>]*>/s', '<a class="button primary" href="upload-workbook.php">↥ Upload workbook</a>', $html, 1);
if ($flash) {
    $notice = '<div class="library-notice' . ($flash['error'] ? ' is-error' : '') . '" role="status">' . pageEscape($flash['message']) . '</div>';
    $html = str_replace('<div id="message"', $notice . '<div id="message"', $html);
}
if ($raw !== null) {
    $controls = '<div class="selected-workbook-actions"><span>Selected workbook: <strong>' . pageEscape($raw['source']) . '</strong></span>'
        . pageAction('unload', '', 'Clear dashboard', $token) . '<a class="text-button" href="files.php">Change workbook</a></div>';
    $html = str_replace('<div id="message"', $controls . '<div id="message"', $html);
}
$jsonFlags = JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE;
$bootstrap = '<script>window.SFSN_PAGE=' . json_encode($dashboardPage, $jsonFlags)
    . ';window.SFSN_WORKBOOK=' . json_encode($raw, $jsonFlags)
    . ';window.SFSN_LOAD_ERROR=' . json_encode($loadError, $jsonFlags) . ';</script>';
$html = str_replace('<script type="module" src="app.mjs"></script>', $bootstrap . '<script type="module" src="app.mjs"></script>', $html);
echo $html;
