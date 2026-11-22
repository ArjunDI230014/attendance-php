<?php
declare(strict_types=1);
require_once __DIR__ . '/page-shell.php';
$libraryView = $libraryView ?? 'active';
$archived = $libraryView === 'archived';
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
    $archived ? 'Restore older workbooks or permanently remove files you no longer need.' : 'Your saved workbooks, ready to download or use in the dashboard.');
if ($result['status'] !== 200) pageNotice($result['body']['error'], true);
$activeCount = count(array_filter($all, fn($file) => $file['archivedAt'] === null));
?>
<div class="library-summary">
    <article><span>Active workbooks</span><strong><?= $activeCount ?></strong></article>
    <article><span>Archived workbooks</span><strong><?= count($all) - $activeCount ?></strong></article>
    <article><span>Storage used</span><strong><?= pageEscape(pageBytes(array_sum(array_column($all, 'size')))) ?></strong></article>
</div>
<section class="panel">
    <div class="panel-head"><div><h2><?= $archived ? 'Archived workbooks' : 'Active workbooks' ?></h2><p><?= $archived ? 'Archived files remain downloadable. Restore a file to use it again.' : 'Choose a workbook to display its attendance records.' ?></p></div><a class="button primary" href="upload-workbook.php">↥ Upload workbook</a></div>
    <form method="get" class="library-toolbar">
        <label class="native-search">Search file names<input type="search" name="q" value="<?= pageEscape($query) ?>" placeholder="Search workbooks…"></label>
        <label>Sort by<select name="sort"><?php foreach (['newest' => 'Newest first', 'oldest' => 'Oldest first', 'name' => 'File name', 'size' => 'Largest first'] as $value => $label): ?><option value="<?= $value ?>" <?= $value === $sort ? 'selected' : '' ?>><?= $label ?></option><?php endforeach ?></select></label>
        <button class="button secondary" type="submit">Search</button><a class="text-button" href="<?= $archived ? 'archive.php' : 'files.php' ?>">Reset</a>
    </form>
    <p class="library-count"><?= count($files) ?> <?= count($files) === 1 ? 'workbook' : 'workbooks' ?></p>
    <?php if (!$files): ?>
        <div class="library-empty"><span aria-hidden="true">▤</span><h3><?= $query !== '' ? 'No matching workbooks' : ($archived ? 'Your archive is empty' : 'No workbooks uploaded yet') ?></h3><p><?= $archived ? 'Files you archive will appear here.' : 'Upload an Excel workbook to start your library.' ?></p><?php if (!$archived): ?><a class="button primary empty-upload" href="upload-workbook.php">Upload your first workbook</a><?php endif ?></div>
    <?php else: ?>
        <div class="table-wrap native-files"><table><thead><tr><th>Workbook</th><th>Size / sheets</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>
        <?php foreach ($files as $file): $id = $file['id']; $return = $archived ? 'archive' : 'files'; ?>
            <tr><td class="library-file-name"><div><span class="excel-icon" aria-hidden="true">X</span><div><strong><?= pageEscape($file['name']) ?></strong><small><?= pageEscape(implode(' · ', $file['sheets'])) ?></small><?php if ($selected === $id && !$archived): ?><span class="pill clear">Selected in dashboard</span><?php endif ?></div></div></td>
            <td><?= pageEscape(pageBytes($file['size'])) ?><small><?= count($file['sheets']) ?> worksheets</small></td><td><?= pageEscape(pageDate($file['uploadedAt'])) ?><?php if ($archived): ?><small>Archived <?= pageEscape(pageDate($file['archivedAt'])) ?></small><?php endif ?></td>
            <td><div class="library-row-actions">
                <?php if (!$archived) echo pageAction('use', $id, 'Use in dashboard', $token, $return, 'button secondary'); ?>
                <a class="text-button" href="file-library.php?action=download&amp;id=<?= $id ?>">Download</a>
                <a class="text-button" href="edit-workbook.php?id=<?= $id ?>&amp;action=rename">Rename</a>
                <?= pageAction($archived ? 'restore' : 'archive', $id, $archived ? 'Restore' : 'Archive', $token, $return) ?>
                <?php if ($archived): ?><a class="text-button library-danger" href="edit-workbook.php?id=<?= $id ?>&amp;action=delete">Delete</a><?php endif ?>
            </div></td></tr>
        <?php endforeach ?>
        </tbody></table></div>
    <?php endif ?>
    <p class="small-note">Workbooks are saved on this computer. Archiving keeps the file; permanent deletion is available from the archive. Times are shown in Malaysia time.</p>
</section>
<?php pageEnd(); ?>
