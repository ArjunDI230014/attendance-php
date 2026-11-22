<?php
declare(strict_types=1);
require_once __DIR__ . '/../includes/layout/theme.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Choose a section · SummitNext Attendance</title><link rel="stylesheet" href="assets/css/shared/styles.css"><link rel="stylesheet" href="assets/css/shared/pages.css"><?= themeAssets() ?></head>
<body class="workspace-home"><header class="workspace-home-header"><a class="brand" href="index.php"><span class="brand-icon">s.</span><span>SummitNext<small>OPERATIONS INTELLIGENCE</small></span></a><div class="theme-header-actions"><span class="local-tag">● Local workbook library</span><?= themeButton() ?></div></header>
<main class="workspace-home-main"><div class="eyebrow">ATTENDANCE OPERATIONS</div><h1>Choose your workspace</h1><p class="workspace-intro">Two operations. Each with its own attendance and Excel library.</p>
<div class="workspace-cards">
<?php foreach (ATTENDANCE_WORKSPACES as $key => $label): ?>
<a class="workspace-card workspace-<?= $key ?>" href="overview.php?workspace=<?= $key ?>"><span class="workspace-symbol" aria-hidden="true"><?= $key === 'marketplace' ? '▤' : '◉' ?></span><span class="eyebrow"><?= $key === 'food' ? 'SHOPEE FOOD' : 'SHOPEE MARKETPLACE' ?></span><h2><?= $label ?></h2><p>Staff attendance · Excel files<br>Upload workbook · Archive</p><span class="workspace-enter">Open <?= $label ?> <span aria-hidden="true">↗</span></span></a>
<?php endforeach ?>
</div><p class="workspace-separation">Marketplace and Food have separate workbook storage, attendance, archives and follow-up actions.</p></main>
<footer class="workspace-home-footer"><span>SummitNext / Attendance Operations</span><span>Private attendance information · Stored on this computer</span></footer></body></html>
