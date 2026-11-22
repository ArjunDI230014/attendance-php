import {initializeFileDialogs} from './file-dialogs.mjs';
import {initializeUploadForm} from './upload-form.mjs';
globalThis.SummitNextFileCleanup?.();
const cleanups = [initializeFileDialogs()];
if (document.getElementById('workbook-upload-form')) cleanups.push(initializeUploadForm());
globalThis.SummitNextFileCleanup = () => cleanups.forEach(cleanup => cleanup());
