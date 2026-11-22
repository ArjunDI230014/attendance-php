<section class="panel workbook-upload-panel" id="upload-workbook" aria-labelledby="workbook-upload-title">
    <div class="panel-head"><div><h2 id="workbook-upload-title">Upload workbook</h2><p>Add an Excel file to <?= workspaceLabel() ?>. Your saved files are listed below.</p></div></div>
    <form method="post" action="<?= pageEscape(workspaceUrl('files.php')) ?>" enctype="multipart/form-data" class="native-upload-form inline-workbook-upload" id="workbook-upload-form">
        <?= pageCsrf($token) ?><input type="hidden" name="MAX_FILE_SIZE" value="31457280">
        <div class="upload-file-field"><label for="workbook">Excel workbook (.xlsx)</label><input type="file" id="workbook" name="workbook" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required aria-describedby="upload-help"></div>
        <div class="upload-mode-field"><label for="upload-mode">After uploading</label><select id="upload-mode" name="mode"><option value="save">Save to Excel files</option><option value="open">Open in dashboard</option></select></div>
        <button type="submit" class="button primary" id="upload-submit">Upload workbook</button>
        <p id="upload-help">Up to 30 MB per file. Choose a workbook to start uploading, or use the upload button.</p>
        <div id="upload-status" role="status" aria-live="polite"></div>
        <noscript><p>Select your workbook, then click Upload workbook to continue.</p></noscript>
    </form>
</section>
