<?php
declare(strict_types=1);
require_once __DIR__ . '/../layout/page-shell.php';
$libraryView = $libraryView ?? 'active';
$archived = $libraryView === 'archived';
if (!$archived) require_once __DIR__ . '/upload-handler.php';
$result = libraryRequest('GET', 'list');
$all = $result['body']['files'] ?? [];
$token = $result['body']['token'] ?? libraryToken();
$selected = libraryActive();
$query = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
$sort = is_string($_GET['sort'] ?? null) ? $_GET['sort'] : 'newest';
$files = array_values(array_filter($all, fn($file) => ($file['archivedAt'] !== null) === $archived
    && ($query === '' || mb_stripos($file['name'], $query) !== false)));
usort($files, fn($a, $b) => match ($sort) {
    'name' => strnatcasecmp($a['name'], $b['name']),
    'size' => $b['size'] <=> $a['size'],
    'oldest' => strcmp($a['uploadedAt'], $b['uploadedAt']),
    default => strcmp($b['uploadedAt'], $a['uploadedAt']),
});
pageStart($archived ? 'archive' : 'files', $archived ? 'Workbook archive' : 'Excel file management',
    $archived ? 'Restore older workbooks or permanently remove files you no longer need.' : 'Upload and manage your Excel workbooks in one place.');
if (!empty($uploadError)) pageNotice($uploadError, true);
if ($result['status'] !== 200) pageNotice($result['body']['error'], true);
$activeCount = count(array_filter($all, fn($file) => $file['archivedAt'] === null));
?>
<div class="library-summary">
    <article><span>Active workbooks</span><strong><?= $activeCount ?></strong></article>
    <article><span>Archived workbooks</span><strong><?= count($all) - $activeCount ?></strong></article>
    <article><span>Storage used</span><strong><?= pageEscape(pageBytes(array_sum(array_column($all, 'size')))) ?></strong></article>
</div>
<?php if (!$archived) require __DIR__ . '/../../views/upload-panel.php'; ?>
<section class="panel">
    <div class="panel-head"><div><h2><?= $archived ? 'Archived workbooks' : 'Active workbooks' ?></h2><p><?= $archived ? 'Archived files remain downloadable. Restore a file to use it again.' : 'Choose a workbook to display its attendance records.' ?></p></div><?php if ($archived): ?><a class="button primary" href="<?= pageEscape(workspaceUrl('files.php')) ?>#upload-workbook">↥ Upload workbook</a><?php endif ?></div>
    <form method="get" class="library-toolbar"><?= workspaceField() ?>
        <label class="native-search">Search file names<input type="search" name="q" value="<?= pageEscape($query) ?>" placeholder="Search workbooks…"></label>
        <label>Sort by<select name="sort"><?php foreach (['newest' => 'Newest first', 'oldest' => 'Oldest first', 'name' => 'File name', 'size' => 'Largest first'] as $value => $label): ?><option value="<?= $value ?>" <?= $value === $sort ? 'selected' : '' ?>><?= $label ?></option><?php endforeach ?></select></label>
        <button class="button secondary" type="submit">Search</button><a class="text-button" href="<?= pageEscape(workspaceUrl($archived ? 'archive.php' : 'files.php')) ?>">Reset</a>
    </form>
    <p class="library-count"><?= count($files) ?> <?= count($files) === 1 ? 'workbook' : 'workbooks' ?></p>
    <?php if (!$files): ?>
        <div class="library-empty"><span aria-hidden="true">▤</span><h3><?= $query !== '' ? 'No matching workbooks' : ($archived ? 'Your archive is empty' : 'No workbooks uploaded yet') ?></h3><p><?= $archived ? 'Files you archive will appear here.' : 'Use the upload controls above to add your first Excel workbook.' ?></p></div>
    <?php else: ?>
        <div class="table-wrap native-files"><table><thead><tr><th>Workbook</th><th>Size / sheets</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>
        <?php foreach ($files as $file): $id = $file['id']; $return = $archived ? 'archive' : 'files'; ?>
            <tr><td class="library-file-name"><div><span class="excel-icon" aria-hidden="true">X</span><div><strong><?= pageEscape($file['name']) ?></strong><small><?= pageEscape(implode(' · ', $file['sheets'])) ?></small><?php if ($selected === $id && !$archived): ?><span class="pill clear">Selected in dashboard</span><?php endif ?></div></div></td>
            <td><?= pageEscape(pageBytes($file['size'])) ?><small><?= count($file['sheets']) ?> worksheets</small></td><td><?= pageEscape(pageDate($file['uploadedAt'])) ?><?php if ($archived): ?><small>Archived <?= pageEscape(pageDate($file['archivedAt'])) ?></small><?php endif ?></td>
            <td><div class="library-row-actions">
                <?php if (!$archived) echo pageAction('use', $id, 'Use in dashboard', $token, $return, 'button secondary'); ?>
                <a class="text-button" href="<?= pageEscape(workspaceUrl('file-library.php?action=download&id=' . $id)) ?>">Download</a>
                <a class="text-button" href="<?= pageEscape(workspaceUrl('edit-workbook.php?id=' . $id . '&action=rename')) ?>" data-workbook-dialog="rename" data-id="<?= pageEscape($id) ?>" data-name="<?= pageEscape($file['name']) ?>">Rename</a>
                <?= pageAction($archived ? 'restore' : 'archive', $id, $archived ? 'Restore' : 'Archive', $token, $return) ?>
                <?php if ($archived): ?><a class="text-button library-danger" href="<?= pageEscape(workspaceUrl('edit-workbook.php?id=' . $id . '&action=delete')) ?>" data-workbook-dialog="delete" data-id="<?= pageEscape($id) ?>" data-name="<?= pageEscape($file['name']) ?>">Delete</a><?php endif ?>
            </div></td></tr>
        <?php endforeach ?>
        </tbody></table></div>
    <?php endif ?>
    <p class="small-note">Your selected workbook stays selected on this computer until you choose another workbook or clear the dashboard. Marketplace and Food remember their selections separately. Archiving the selected workbook clears its selection. Times are shown in Malaysia time.</p>
</section>
<dialog id="library-dialog" aria-labelledby="library-dialog-title" aria-describedby="library-dialog-description">
    <form id="workbook-dialog-form" method="post" action="<?= pageEscape(workspaceUrl('file-action.php')) ?>" data-api-url="<?= pageEscape(workspaceUrl('file-library.php')) ?>">
        <?= pageCsrf($token) ?>
        <input type="hidden" name="action" id="workbook-dialog-action">
        <input type="hidden" name="id" id="workbook-dialog-id">
        <input type="hidden" name="return" value="<?= $archived ? 'archive' : 'files' ?>">
        <div class="dialog-head"><h2 id="library-dialog-title">Rename workbook</h2><button type="button" class="icon-button" id="workbook-dialog-close" aria-label="Close">×</button></div>
        <p id="library-dialog-description"></p>
        <p id="workbook-dialog-filename" class="workbook-dialog-filename"></p>
        <label id="library-name-label" for="library-name">File name<input id="library-name" name="name" type="text" maxlength="180" required autocomplete="off"></label>
        <p id="workbook-dialog-hint" class="small-note">Keep the .xlsx extension.</p>
        <div id="workbook-dialog-error" class="library-notice is-error" role="alert" aria-live="polite"></div>
        <div class="library-dialog-actions"><button type="button" class="button secondary" id="workbook-dialog-cancel">Cancel</button><button type="submit" class="button primary" id="workbook-dialog-submit">Save name</button></div>
    </form>
</dialog>
<script type="module" src="assets/js/files/file-page-entry.mjs"></script>
<?php pageEnd(); ?>
