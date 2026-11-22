// Apply the saved theme before the page paints, including after navigation.
(() => {
    const key = 'summitnext:theme:' + new URL('.', location.href).pathname;
    let theme = 'light';
    try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch {}
    document.documentElement.dataset.theme = theme;
})();
