const form = document.getElementById('workbook-upload-form');
const input = document.getElementById('workbook');
const button = document.getElementById('upload-submit');
const mode = document.getElementById('upload-mode');
const status = document.getElementById('upload-status');
let busy = false;

function showStatus(message, error = false) {
    status.textContent = message;
    status.className = 'library-notice' + (error ? ' is-error' : '');
    status.setAttribute('role', error ? 'alert' : 'status');
}

async function submitUpload() {
    if (busy) return;
    const file = input.files[0];
    if (!file) { showStatus('Choose an Excel workbook first.', true); input.focus(); return; }
    if (!/\.xlsx$/i.test(file.name)) { showStatus('Choose an .xlsx workbook. Save older .xls files as .xlsx first.', true); return; }
    if (file.size > 30 * 1024 * 1024) { showStatus('This workbook exceeds the 30 MB upload limit.', true); return; }
    // Capture the file and CSRF token before disabling any form fields.
    const body = new FormData(form);
    busy = true;
    input.disabled = button.disabled = mode.disabled = true;
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Uploading…';
    showStatus(`Uploading ${file.name} and checking the workbook. Please keep this page open…`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 150000);
    try {
        const response = await fetch(form.action, {method:'POST', body, credentials:'same-origin', headers:{Accept:'application/json'}, signal:controller.signal});
        let result;
        try { result = await response.json(); } catch { throw Error('The upload server did not return a valid response. Refresh this page and try again.'); }
        if (!response.ok || result.error) throw Error(result.error || 'The workbook could not be uploaded.');
        if (!['index.php','files.php'].includes(result.redirect)) throw Error('The upload finished without a valid destination. Open Excel files to check the saved workbook.');
        showStatus(result.redirect === 'index.php' ? 'Workbook uploaded. Opening the dashboard…' : 'Workbook saved. Opening Excel files…');
        location.assign(result.redirect);
    } catch (error) {
        showStatus(error.name === 'AbortError' ? 'The upload took too long. Check Excel files before retrying; the server may still have saved the workbook.' : error.message, true);
    } finally {
        clearTimeout(timeout);
        busy = false;
        input.disabled = button.disabled = mode.disabled = false;
        form.setAttribute('aria-busy', 'false');
        button.textContent = mode.value === 'save' ? 'Upload workbook' : 'Upload & open workbook';
    }
}

input.addEventListener('change', () => { if (input.files.length) submitUpload(); });
form.addEventListener('submit', event => { event.preventDefault(); submitUpload(); });
button.addEventListener('click', event => { event.preventDefault(); submitUpload(); });
mode.addEventListener('change', () => { button.textContent = mode.value === 'save' ? 'Upload workbook' : 'Upload & open workbook'; });
