const pageNames = new Set(['', 'index.php', 'overview.php', 'people.php', 'files.php', 'archive.php', 'upload-workbook.php', 'edit-workbook.php', 'file-action.php']);

export function installNavigation(loading, persistentNodes = []) {
    const folder = new URL('.', location.href);
    let requestNumber = 0;
    let pendingRequest;
    let activeReveal;
    let shownUrl = location.href;
    let fileCleanup;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');

    function isLocalPage(value) {
        const url = new URL(value, location.href);
        return url.origin === folder.origin && url.pathname.startsWith(folder.pathname)
            && pageNames.has(url.pathname.slice(folder.pathname.length));
    }

    async function preparePage(response, signal) {
        if (!response.headers.get('content-type')?.includes('text/html') || !isLocalPage(response.url)) {
            throw Error('The page could not be opened. Please try again.');
        }
        const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
        if (signal.aborted) throw new DOMException('Navigation cancelled', 'AbortError');
        if (!parsed.querySelector('main')) throw Error('The page could not be opened. Please try again.');
        const dashboard = parsed.getElementById('dashboard-state');
        const state = dashboard ? JSON.parse(dashboard.textContent) : null;
        // Validate the section before changing any displayed attendance state.
        if (state && !['food', 'marketplace'].includes(state.SFSN_WORKSPACE)) throw Error('Invalid workspace.');
        if (state && state.SFSN_WORKSPACE !== new URL(response.url).searchParams.get('workspace')) throw Error('The page returned a different workspace. Please try again.');
        const styles = [...parsed.querySelectorAll('link[rel="stylesheet"]')].map(link => {
            const href = new URL(link.getAttribute('href'), response.url).href;
            if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(existing => existing.href === href)) return;
            return new Promise((resolve, reject) => {
                const style = document.createElement('link');
                style.rel = 'stylesheet'; style.href = href;
                style.onload = resolve;
                style.onerror = () => { style.remove(); reject(Error('The page styles could not be loaded. Please try again.')); };
                document.head.append(style);
            });
        });
        const dashboardModule = state ? import('../dashboard/app.mjs') : null;
        const filesModule = parsed.getElementById('workbook-dialog-form') ? import('../files/file-dialogs.mjs') : null;
        const uploadModule = parsed.getElementById('workbook-upload-form') ? import('../files/upload-form.mjs') : null;
        const [, app, files, upload] = await Promise.all([Promise.all(styles), dashboardModule, filesModule, uploadModule]);
        // Only the known page initializers run; fetched scripts are never evaluated.
        parsed.querySelectorAll('script').forEach(script => script.remove());
        return {parsed, state, app, files, upload};
    }

    function rememberScroll() {
        history.replaceState({...history.state, summitnext: true, scroll: [scrollX, scrollY]}, '', location.href);
    }

    function finishReveal() {
        activeReveal?.animation.cancel();
        activeReveal?.snapshot.remove();
        activeReveal = null;
    }

    function snapshotContent() {
        const main = document.querySelector('main');
        if (!main || motion.matches || typeof main.animate !== 'function') return null;
        const bounds = main.getBoundingClientRect();
        const copy = main.cloneNode(true);
        const originalElements = [main, ...main.querySelectorAll('*')];
        const copiedElements = [copy, ...copy.querySelectorAll('*')];
        // Freeze visibility before the next page changes body classes or dashboard state.
        originalElements.forEach((element, index) => {
            const style = getComputedStyle(element);
            const clone = copiedElements[index];
            clone.style.display = style.display;
            clone.style.visibility = style.visibility;
            if ('value' in element && element.type !== 'file') clone.value = element.value;
            clone.scrollTop = element.scrollTop;
            clone.scrollLeft = element.scrollLeft;
        });
        copy.querySelectorAll('script,dialog').forEach(element => element.remove());
        copy.style.cssText += `;position:absolute;left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;max-width:none;margin:0;background:var(--bg);`;
        const snapshot = document.createElement('div');
        snapshot.className = 'navigation-snapshot';
        snapshot.setAttribute('aria-hidden', 'true');
        snapshot.inert = true;
        snapshot.append(copy);
        return snapshot;
    }

    async function navigate(value, options = {}) {
        const target = new URL(value, location.href);
        if (!isLocalPage(target.href)) { location.assign(target.href); return false; }
        const number = ++requestNumber;
        pendingRequest?.abort();
        finishReveal();
        const controller = new AbortController();
        pendingRequest = controller;
        loading.start();
        const timeout = setTimeout(() => controller.abort('timeout'), 120000);
        try {
            const response = await fetch(target.href, {
                method: options.method || 'GET', body: options.body,
                credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
                headers: {Accept: 'text/html'},
            });
            const page = await preparePage(response, controller.signal);
            await globalThis.SummitNextTheme?.whenIdle?.();
            if (number !== requestNumber || controller.signal.aborted) return false;
            const destination = new URL(response.url);
            if (target.hash && destination.pathname === target.pathname) destination.hash = target.hash;
            const position = options.scroll || [0, 0];
            const snapshot = snapshotContent();
            let committed = false;
            const commit = () => {
                if (number !== requestNumber) return;
                globalThis.SummitNextDashboardCleanup?.();
                globalThis.SummitNextDashboardCleanup = null;
                globalThis.SummitNextFileCleanup?.();
                globalThis.SummitNextFileCleanup = null;
                fileCleanup?.(); fileCleanup = null;
                if (options.history !== 'pop') {
                    rememberScroll();
                    const action = options.history === 'replace' || destination.href === shownUrl ? 'replaceState' : 'pushState';
                    history[action]({summitnext: true, scroll: position}, '', destination.href);
                }
                shownUrl = destination.href;
                document.title = page.parsed.title;
                for (const attribute of [...document.body.attributes]) document.body.removeAttribute(attribute.name);
                for (const attribute of page.parsed.body.attributes) document.body.setAttribute(attribute.name, attribute.value);
                document.body.replaceChildren(...[...page.parsed.body.childNodes].map(node => document.importNode(node, true)));
                document.body.append(...persistentNodes);
                if (page.app) globalThis.SummitNextDashboardCleanup = page.app.initializeDashboard(page.state);
                const cleanups = [];
                if (page.files) cleanups.push(page.files.initializeFileDialogs());
                if (page.upload) cleanups.push(page.upload.initializeUploadForm());
                fileCleanup = () => cleanups.forEach(cleanup => cleanup());
                globalThis.SummitNextTheme?.refresh();
                window.scrollTo({left: position[0], top: position[1], behavior: 'instant'});
                if (destination.hash && options.history !== 'pop') {
                    document.getElementById(decodeURIComponent(destination.hash.slice(1)))?.scrollIntoView({behavior: 'instant'});
                }
                const heading = document.querySelector('main h1');
                heading?.setAttribute('tabindex', '-1');
                heading?.focus({preventScroll: true});
                committed = true;
            };
            // Keep the previous content above the new page until initialization is complete.
            loading.stop();
            commit();
            if (snapshot && committed) {
                document.body.append(snapshot);
                const animation = snapshot.animate([{opacity: 1}, {opacity: 0}], {duration: 280, easing: 'cubic-bezier(.2,0,.2,1)'});
                const reveal = {snapshot, animation};
                activeReveal = reveal;
                await animation.finished.catch(() => {});
                snapshot.remove();
                if (activeReveal === reveal) activeReveal = null;
            }
            return committed;
        } catch (error) {
            if (number !== requestNumber) return false;
            // Keep the usable current page on network errors instead of revealing a blank screen.
            const main = document.querySelector('main');
            document.getElementById('navigation-error')?.remove();
            const notice = document.createElement('div');
            notice.id = 'navigation-error'; notice.className = 'library-notice is-error';
            notice.setAttribute('role', 'alert');
            notice.textContent = controller.signal.aborted ? 'This page took too long to open. Please try again.' : (error.message || 'The page could not be opened. Please try again.');
            main?.prepend(notice);
            if (options.history === 'pop') history.replaceState(history.state, '', shownUrl);
            return false;
        } finally {
            clearTimeout(timeout);
            if (number === requestNumber) { pendingRequest = null; loading.stop(); }
        }
    }

    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (event.defaultPrevented || !link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.hasAttribute('download') || link.hasAttribute('data-workbook-dialog')) return;
        if (link.getAttribute('target') && link.getAttribute('target') !== '_self') return;
        const destination = new URL(link.href, location.href);
        if (!isLocalPage(destination.href)) return;
        if (destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
        event.preventDefault();
        void navigate(destination.href);
    });

    document.addEventListener('submit', event => {
        if (event.defaultPrevented) return;
        const form = event.target;
        const submitter = event.submitter;
        const method = (submitter?.getAttribute('formmethod') || form.getAttribute('method') || 'get').toUpperCase();
        const target = submitter?.getAttribute('formtarget') || form.getAttribute('target');
        const action = submitter?.getAttribute('formaction') || form.getAttribute('action') || location.href;
        if (!['GET','POST'].includes(method) || (target && target !== '_self') || !isLocalPage(action)) return;
        event.preventDefault();
        const body = new FormData(form, submitter);
        const destination = new URL(action, location.href);
        if (method === 'GET') {
            destination.search = new URLSearchParams(body).toString();
            void navigate(destination.href);
        } else void navigate(destination.href, {method, body});
    });

    window.addEventListener('popstate', event => {
        // Hash-only history changes stay native.
        const before = new URL(shownUrl), after = new URL(location.href);
        if (before.pathname === after.pathname && before.search === after.search) { shownUrl = after.href; return; }
        void navigate(location.href, {history: 'pop', scroll: event.state?.scroll || [0, 0]});
    });
    history.replaceState({...history.state, summitnext: true, scroll: [scrollX, scrollY]}, '', location.href);
    globalThis.SummitNextLoading = {...loading, navigate, reload: () => navigate(location.href, {history: 'replace', scroll: [scrollX, scrollY]})};
}
