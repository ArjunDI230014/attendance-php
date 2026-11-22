const root = document.documentElement;
const buttons = () => [...document.querySelectorAll('.theme-toggle')];
const boundButtons = new WeakSet();
const preferenceKey = 'summitnext:theme:' + new URL('.', location.href).pathname;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let revealing = false;
let pendingTheme = Promise.resolve();

function applyTheme(theme, save = true) {
    root.dataset.theme = theme;
    for (const button of buttons()) {
        const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
        button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    if (save) { try { localStorage.setItem(preferenceKey, theme); } catch {} }
}

applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light', false);

async function toggleTheme(button) {
    if (revealing) return;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (reducedMotion.matches || typeof document.startViewTransition !== 'function' || typeof root.animate !== 'function') {
        applyTheme(next);
        return;
    }
    const bounds = button.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    revealing = true;
    root.dataset.themeTransition = 'true';
    button.setAttribute('aria-busy', 'true');
    let transition;
    try {
        transition = document.startViewTransition(() => applyTheme(next));
        // Handle a skipped transition as well as an animation that is cancelled.
        const finished = transition.finished.catch(() => {});
        await transition.ready;
        const animation = root.animate({
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        }, {
            duration: 650, easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)',
        });
        await animation.finished;
        await finished;
    } catch {
        transition?.skipTransition();
        applyTheme(next);
    } finally {
        revealing = false;
        delete root.dataset.themeTransition;
        button.removeAttribute('aria-busy');
    }
}

function refresh() {
    for (const button of buttons()) {
        if (boundButtons.has(button)) continue;
        boundButtons.add(button);
        button.addEventListener('click', () => { if (!revealing) pendingTheme = toggleTheme(button); });
    }
    applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light', false);
}
refresh();
globalThis.SummitNextTheme = {refresh, whenIdle: () => pendingTheme};
window.addEventListener('storage', event => {
    if (event.key === preferenceKey && !revealing) applyTheme(event.newValue === 'dark' ? 'dark' : 'light', false);
});
