import {initializeDashboard} from './app.mjs';
globalThis.SummitNextDashboardCleanup?.();
globalThis.SummitNextDashboardCleanup = initializeDashboard();
