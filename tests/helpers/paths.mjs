import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const appRoot = path.join(projectRoot, 'app');
export const appUrl = new URL('../../app/', import.meta.url);
