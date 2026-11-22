<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/layout/page-shell.php';
$token = libraryToken();
$id = is_string($_GET['id'] ?? null) ? $_GET['id'] : '';
$deleting = ($_GET['action'] ?? '') === 'delete';
$result = libraryRequest('GET', 'list');
$file = null;
foreach ($result['body']['files'] ?? [] as $entry) if ($entry['id'] === $id) $file = $entry;
if (!$file || ($deleting && $file['archivedAt'] === null)) {
    http_response_code($file ? 409 : 404);
    pageStart('files', 'Workbook unavailable', 'Select a workbook from Excel files or the archive.');
    pageNotice($file ? 'Archive a workbook before permanently deleting it.' : 'This workbook was not found.', true);
    pageEnd();
    exit;
}
$return = $file['archivedAt'] !== null ? 'archive' : 'files';
pageStart($return, $deleting ? 'Delete archived workbook' : 'Rename workbook', $file['name']);
?>
<section class="panel edit-page">
    <h2><?= $deleting ? 'Permanently delete this workbook?' : 'Choose a new file name' ?></h2>
    <p><?= $deleting ? 'The original workbook will be removed from this computer’s library. This cannot be undone.' : 'Renaming updates the library and download name. The contents of the Excel workbook stay the same.' ?></p>
    <form method="post" action="<?= pageEscape(workspaceUrl('file-action.php')) ?>">
        <?= pageCsrf($token) ?><input type="hidden" name="action" value="<?= $deleting ? 'delete' : 'rename' ?>"><input type="hidden" name="id" value="<?= pageEscape($id) ?>"><input type="hidden" name="return" value="<?= $return ?>">
        <?php if (!$deleting): ?><label for="name">File name<input id="name" name="name" value="<?= pageEscape($file['name']) ?>" maxlength="180" required></label><p class="small-note">Keep the .xlsx extension.</p><?php else: ?><div class="notice"><strong><?= pageEscape($file['name']) ?></strong><p><?= pageEscape(pageBytes($file['size'])) ?> · Uploaded <?= pageEscape(pageDate($file['uploadedAt'])) ?></p></div><?php endif ?>
        <div class="native-form-actions"><button type="submit" class="button primary <?= $deleting ? 'danger-button' : '' ?>"><?= $deleting ? 'Delete permanently' : 'Save name' ?></button><a class="button secondary" href="<?= pageEscape(workspaceUrl($return . '.php')) ?>">Cancel</a></div>
    </form>
</section>
<?php pageEnd(); ?>
