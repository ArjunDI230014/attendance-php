const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bytes = value => value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
const date = value => new Date(value).toLocaleString('en-MY', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Kuala_Lumpur'});

export function initFileLibrary({onLoad, onRelease}) {
    const section = document.createElement('section');
    section.id = 'files';
    section.className = 'page file-library';
    section.hidden = true;
    section.innerHTML = `
        <div id="library-notice" class="library-notice" role="status" aria-live="polite"></div>
        <div class="library-summary" aria-label="File library summary">
            <article><span>Active workbooks</span><strong id="library-active">—</strong></article>
            <article><span>Archived workbooks</span><strong id="library-archived">—</strong></article>
            <article><span>Storage used</span><strong id="library-size">—</strong></article>
        </div>
        <section class="panel library-upload" id="library-drop">
            <div class="library-upload-icon" aria-hidden="true">↥</div>
            <div><h2>A home for your Excel files</h2><p>Drop workbooks here or choose files to upload. Saved files stay available after you close the page.</p><small>.xlsx files · Up to 30 MB each · Stored on this computer</small></div>
            <div class="library-file-picker">
                <label for="library-upload">Upload Excel files</label>
                <input type="file" id="library-upload" aria-label="Upload Excel files" accept=".xlsx" multiple>
            </div>
        </section>
        <section class="panel library-panel">
            <div class="panel-head"><div><h2>Workbook library</h2><p>Open attendance workbooks in the dashboard, or keep older versions in the archive.</p></div><button class="button secondary" id="library-refresh" type="button">↻ Refresh</button></div>
            <div class="library-toolbar">
                <div class="library-tabs" role="group" aria-label="File status">
                    <button type="button" data-library-tab="active" aria-pressed="true">Active</button>
                    <button type="button" data-library-tab="archived" aria-pressed="false">Archive</button>
                    <button type="button" data-library-tab="all" aria-pressed="false">All files</button>
                </div>
                <label class="library-search"><span class="sr-only">Search workbooks</span><input id="library-search" type="search" placeholder="Search file names…"></label>
                <label><span class="sr-only">Sort workbooks</span><select id="library-sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">File name</option><option value="size">Largest first</option></select></label>
            </div>
            <p id="library-count" class="library-count"></p>
            <div id="library-list" class="table-wrap" aria-live="polite"></div>
            <p class="small-note">Archiving keeps the original file and removes it from the active list. Restore it any time. Permanent deletion is available in the archive. Workbook dates are shown in Malaysia time.</p>
        </section>
        <dialog id="library-dialog" aria-labelledby="library-dialog-title">
            <form id="library-dialog-form">
                <div class="dialog-head"><h2 id="library-dialog-title"></h2><button type="button" class="icon-button" id="library-dialog-close" aria-label="Close">×</button></div>
                <p id="library-dialog-description"></p>
                <label id="library-name-label">File name<input id="library-name" type="text" maxlength="180" required autocomplete="off"></label>
                <div class="library-dialog-actions"><button type="button" class="button secondary" id="library-dialog-cancel">Cancel</button><button type="submit" class="button primary" id="library-dialog-submit">Save name</button></div>
            </form>
        </dialog>`;
    document.querySelector('main footer').before(section);
    const $ = id => section.querySelector(`#${id}`);
    let files = [], token = '', tab = 'active', busy = false, loaded = false, pending = null, selected = null;

    function notice(text, error = false) {
        $('library-notice').textContent = text;
        $('library-notice').classList.toggle('is-error', error);
    }
    async function request(action, values = {}, method = 'GET') {
        if (!window.SFSN_LIBRARY_URL) throw Error('Open http://localhost/attendance_php/ to manage stored Excel files.');
        const url = new URL(window.SFSN_LIBRARY_URL, location.href);
        const options = {credentials:'same-origin', method};
        if (method === 'POST') {
            options.headers = {'X-CSRF-Token': token};
            const form = new FormData();
            form.append('action', action);
            for (const [key, value] of Object.entries(values)) form.append(key, value);
            options.body = form;
        } else {
            url.search = new URLSearchParams({action, ...values});
        }
        const response = await fetch(url, options);
        let result;
        try { result = await response.json(); } catch { throw Error('The file server did not return a valid response. Check that Apache and PHP are running.'); }
        if (!response.ok || result.error) throw Error(result.error || 'The file operation failed. Please try again.');
        return result;
    }
    function lock(value) {
        busy = value;
        section.setAttribute('aria-busy', String(value));
        section.querySelectorAll('button,input,select').forEach(element => element.disabled = value);
    }
    function render() {
        const active = files.filter(file => !file.archivedAt);
        $('library-active').textContent = active.length;
        $('library-archived').textContent = files.length - active.length;
        $('library-size').textContent = bytes(files.reduce((sum, file) => sum + file.size, 0));
        section.querySelectorAll('[data-library-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.libraryTab === tab)));
        const query = $('library-search').value.toLocaleLowerCase();
        const list = files.filter(file => (tab === 'all' || (tab === 'archived' ? !!file.archivedAt : !file.archivedAt)) && file.name.toLocaleLowerCase().includes(query));
        const sort = $('library-sort').value;
        list.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'size' ? b.size - a.size : sort === 'oldest' ? a.uploadedAt.localeCompare(b.uploadedAt) : b.uploadedAt.localeCompare(a.uploadedAt));
        $('library-count').textContent = `${list.length} ${list.length === 1 ? 'workbook' : 'workbooks'}${query ? ' matching your search' : ''}`;
        if (!list.length) {
            $('library-list').innerHTML = `<div class="library-empty"><span aria-hidden="true">▤</span><h3>${query ? 'No matching workbooks' : tab === 'archived' ? 'Your archive is empty' : 'No workbooks here yet'}</h3><p>${query ? 'Try another file name or clear the search.' : tab === 'archived' ? 'Archive older files to keep your active library tidy.' : 'Upload an Excel file above to start your library.'}</p></div>`;
            return;
        }
        $('library-list').innerHTML = `<table><thead><tr><th>Workbook</th><th>Size / sheets</th><th>Uploaded</th><th>Status</th><th>Actions</th></tr></thead><tbody>${list.map(file => {
            const archived = !!file.archivedAt;
            const url = new URL(window.SFSN_LIBRARY_URL, location.href);
            url.search = new URLSearchParams({action:'download', id:file.id});
            return `<tr><td class="library-file-name"><div><span class="excel-icon" aria-hidden="true">X</span><div><strong>${esc(file.name)}</strong><small>${esc(file.sheets.join(' · '))}</small>${selected === file.id ? '<span class="pill clear">Loaded in dashboard</span>' : ''}</div></div></td><td>${bytes(file.size)}<small>${file.sheets.length} ${file.sheets.length === 1 ? 'worksheet' : 'worksheets'}</small></td><td>${esc(date(file.uploadedAt))}${archived ? `<small>Archived ${esc(date(file.archivedAt))}</small>` : ''}</td><td><span class="pill ${archived ? 'neutral' : 'clear'}">${archived ? 'Archived' : 'Active'}</span></td><td><div class="library-row-actions">${!archived ? `<button class="button secondary" type="button" data-library-action="load" data-id="${file.id}">Use in dashboard</button>` : ''}<a class="text-button" href="${esc(url.href)}" download>Download</a><button class="text-button" type="button" data-library-action="rename" data-id="${file.id}">Rename</button><button class="text-button" type="button" data-library-action="${archived ? 'restore' : 'archive'}" data-id="${file.id}">${archived ? 'Restore' : 'Archive'}</button>${archived ? `<button class="text-button library-danger" type="button" data-library-action="delete" data-id="${file.id}">Delete</button>` : ''}</div></td></tr>`;
        }).join('')}</tbody></table>`;
        if (busy) section.querySelectorAll('button,input,select').forEach(element => element.disabled = true);
    }
    async function refresh() {
        const result = await request('list');
        files = result.files;
        token = result.token;
        loaded = true;
        if (selected && !files.some(file => file.id === selected && !file.archivedAt)) {
            selected = null;
            onRelease();
        }
        render();
    }
    async function open() {
        if (busy) return;
        lock(true);
        notice('Loading your file library…');
        try { await refresh(); notice(''); } catch (error) { notice(error.message, true); }
        finally { lock(false); }
    }
    async function upload(fileList) {
        if (busy || !fileList.length) return;
        lock(true);
        let saved = 0;
        const errors = [];
        try {
            if (!loaded) await refresh();
            for (const [index, file] of Array.from(fileList).entries()) {
                notice(`Uploading ${index + 1} of ${fileList.length}: ${file.name}…`);
                try {
                    if (!/\.xlsx$/i.test(file.name)) throw Error('Only .xlsx Excel files are supported.');
                    if (file.size > 30 * 1024 * 1024) throw Error('The file is over 30 MB.');
                    await request('upload', {workbook:file}, 'POST');
                    saved++;
                } catch (error) { errors.push(`${file.name}: ${error.message}`); }
            }
            tab = 'active';
            $('library-search').value = '';
            await refresh();
            notice(`${saved} ${saved === 1 ? 'workbook' : 'workbooks'} saved.${errors.length ? ' ' + errors.join(' ') : ' Choose “Use in dashboard” to open an attendance workbook.'}`, errors.length > 0);
        } catch (error) { notice(error.message, true); }
        finally { $('library-upload').value = ''; lock(false); }
    }
    function showDialog(action, file) {
        pending = {action, file};
        const deleting = action === 'delete';
        $('library-dialog-title').textContent = deleting ? 'Permanently delete workbook?' : 'Rename workbook';
        $('library-dialog-description').textContent = deleting ? `“${file.name}” will be removed from this computer’s library. This cannot be undone.` : 'Update the name used in your library and downloads. Keep the .xlsx extension.';
        $('library-name-label').hidden = deleting;
        $('library-name').required = !deleting;
        $('library-name').value = file.name;
        $('library-dialog-submit').textContent = deleting ? 'Delete permanently' : 'Save name';
        $('library-dialog-submit').classList.toggle('danger-button', deleting);
        $('library-dialog').showModal();
        if (deleting) $('library-dialog-cancel').focus(); else { $('library-name').focus(); $('library-name').select(); }
    }
    async function act(action, file, values = {}) {
        if (busy) return;
        lock(true);
        notice(action === 'load' ? `Reading ${file.name}…` : 'Updating your file library…');
        try {
            if (action === 'load') {
                const result = await request('workbook', {id:file.id});
                // onLoad validates the attendance data before the current dashboard changes.
                onLoad(result.workbook, file);
                selected = file.id;
                render();
                notice(`Loaded ${file.name} into the dashboard. The original remains saved here.`);
            } else {
                await request(action, {id:file.id, ...values}, 'POST');
                if (selected === file.id && ['archive','delete','rename'].includes(action)) {
                    selected = null;
                    onRelease();
                }
                $('library-dialog').close();
                await refresh();
                notice(action === 'delete' ? 'Workbook permanently deleted.' : action === 'archive' ? 'Workbook archived. You can restore it from the Archive tab.' : action === 'restore' ? 'Workbook restored to the active library.' : 'Workbook renamed.');
            }
        } catch (error) { notice(error.message, true); $('library-dialog').close(); }
        finally { lock(false); }
    }
    $('library-upload').onchange = event => upload(event.target.files);
    $('library-refresh').onclick = open;
    $('library-search').oninput = render;
    $('library-sort').onchange = render;
    section.addEventListener('click', event => {
        const button = event.target.closest('[data-library-tab],[data-library-action]');
        if (!button || busy) return;
        if (button.dataset.libraryTab) { tab = button.dataset.libraryTab; render(); return; }
        const file = files.find(file => file.id === button.dataset.id);
        if (!file) return;
        const action = button.dataset.libraryAction;
        if (action === 'rename' || action === 'delete') showDialog(action, file); else act(action, file);
    });
    for (const id of ['library-dialog-close','library-dialog-cancel']) $(id).onclick = () => $('library-dialog').close();
    $('library-dialog-form').onsubmit = event => {
        event.preventDefault();
        if (pending) act(pending.action, pending.file, pending.action === 'rename' ? {name:$('library-name').value.trim()} : {});
    };
    const drop = $('library-drop');
    let dragDepth = 0;
    drop.addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; if (!busy) drop.classList.add('is-dragging'); });
    drop.addEventListener('dragover', event => event.preventDefault());
    drop.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; drop.classList.remove('is-dragging'); } });
    drop.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; drop.classList.remove('is-dragging'); upload(event.dataTransfer.files); });
    return {open, clearSelection() { selected = null; render(); }};
}
