import {installNavigation} from './navigation.mjs';
const root = document.documentElement;
let main;
const progress = document.createElement('div');
progress.className = 'page-loading-progress';
progress.setAttribute('aria-hidden', 'true');
progress.append(document.createElement('span'));
const indicator = document.createElement('div');
indicator.className = 'page-loading-indicator';
indicator.setAttribute('role', 'status');
indicator.setAttribute('aria-live', 'polite');
indicator.setAttribute('aria-hidden', 'true');
document.body.append(progress, indicator);
let recoveryTimer;
let revealTimer;
let previousBusy;

function start() {
    if (root.dataset.pageLoading) return;
    main = document.querySelector('main');
    previousBusy = main?.getAttribute('aria-busy');
    root.dataset.pageLoading = 'pending';
    main?.setAttribute('aria-busy', 'true');
    indicator.setAttribute('aria-hidden', 'false');
    indicator.textContent = 'Loading page…';
    // Recover if navigation is cancelled or the destination cannot be reached.
    clearTimeout(recoveryTimer);
    revealTimer = setTimeout(() => { root.dataset.pageLoading = 'true'; }, 240);
    recoveryTimer = setTimeout(stop, 30000);
}

function stop() {
    clearTimeout(recoveryTimer);
    clearTimeout(revealTimer);
    if (root.dataset.pageLoading) {
        if (previousBusy === null) main?.removeAttribute('aria-busy');
        else if (previousBusy !== undefined) main?.setAttribute('aria-busy', previousBusy);
    }
    delete root.dataset.pageLoading;
    indicator.setAttribute('aria-hidden', 'true');
    indicator.textContent = '';
}

window.addEventListener('pageshow', stop);
installNavigation({start,stop}, [progress,indicator]);
