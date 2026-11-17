<?php
declare(strict_types=1);

// Use the same HTML, styles and calculation modules as the standalone dashboard.
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$html = file_get_contents(__DIR__ . '/index.html');
$html = str_replace('● Browser workspace', '● Excel upload workspace', $html);
$html = str_replace('<script type="module" src="app.mjs"></script>',
    '<script>window.SFSN_UPLOAD_URL="upload.php";</script><script type="module" src="app.mjs"></script>', $html);
echo $html;
