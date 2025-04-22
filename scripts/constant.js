// This is a fallback version of constant.ts for use in scripts
import os from 'os';
import path from 'path';

export const homeDir = os.homedir();
export const appDir = path.join(homeDir, '.dive');
export const scriptsDir = path.join(appDir, 'scripts');
export const configDir = path.join(appDir, 'config');
export const hostCacheDir = path.join(appDir, 'host_cache'); 