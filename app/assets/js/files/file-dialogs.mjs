export function initializeFileDialogs() {
const lifetime = new AbortController();
const dialog = document.getElementById('library-dialog');
const form = document.getElementById('workbook-dialog-form');
const name = document.getElementById('library-name');
const submit = document.getElementById('workbook-dialog-submit');
const cancel = document.getElementById('workbook-dialog-cancel');
const close = document.getElementById('workbook-dialog-close');
const error = document.getElementById('workbook-dialog-error');
let busy = false;
let trigger = null;

if (dialog && typeof dialog.showModal === 'function') {
    document.addEventListener('click', event => {
        const link = event.target.closest('[data-workbook-dialog]');
        if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (busy) return;
        trigger = link;
        const deleting = link.dataset.workbookDialog === 'delete';
        document.getElementById('workbook-dialog-action').value = deleting ? 'delete' : 'rename';
        document.getElementById('workbook-dialog-id').value = link.dataset.id;
        document.getElementById('library-dialog-title').textContent = deleting ? 'Delete archived workbook?' : 'Rename workbook';
        document.getElementById('library-dialog-description').textContent = deleting
            ? 'This workbook will be permanently deleted from this workspace. This cannot be undone.'
            : 'Choose a new file name. The workbook contents stay the same.';
        document.getElementById('workbook-dialog-filename').textContent = link.dataset.name;
        document.getElementById('library-name-label').hidden = deleting;
        document.getElementById('workbook-dialog-hint').hidden = deleting;
        name.required = !deleting;
        name.value = link.dataset.name;
        submit.textContent = deleting ? 'Delete permanently' : 'Save name';
        submit.classList.toggle('danger-button', deleting);
        error.textContent = '';
        dialog.showModal();
        if (deleting) cancel.focus();
        else { name.focus(); name.setSelectionRange(0, name.value.replace(/\.xlsx$/i, '').length); }
    }, {signal: lifetime.signal});

    function dismiss() { if (!busy) dialog.close(); }
    cancel.addEventListener('click', dismiss);
    close.addEventListener('click', dismiss);
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => trigger?.focus());
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy || !form.reportValidity()) return;
        const body = new FormData(form);
        const label = submit.textContent;
        busy = true;
        for (const control of [submit, cancel, close, name]) control.disabled = true;
        form.setAttribute('aria-busy', 'true');
        submit.textContent = body.get('action') === 'delete' ? 'Deleting…' : 'Saving…';
        error.textContent = '';
        try {
            const response = await fetch(form.dataset.apiUrl, {
                method: 'POST', body, credentials: 'same-origin',
                headers: {Accept: 'application/json', 'X-CSRF-Token': body.get('csrf')},
            });
            let result;
            try { result = await response.json(); }
            catch { throw Error('The server did not return a valid response. Please try again.'); }
            if (!response.ok || result.error) throw Error(result.error || 'The workbook could not be updated.');
            // Refresh this same list to preserve its workspace, search and sort order.
            if (globalThis.SummitNextLoading?.reload) await globalThis.SummitNextLoading.reload();
            else location.reload();
        } catch (failure) {
            error.textContent = failure.message || 'The workbook could not be updated. Please try again.';
        } finally {
            busy = false;
            for (const control of [submit, cancel, close, name]) control.disabled = false;
            form.removeAttribute('aria-busy');
            submit.textContent = label;
        }
    });
}

return ()=>lifetime.abort();
}
