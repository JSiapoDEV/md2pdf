// `md2pdf-studio upgrade`: runs only when someone asks for it. It checks npm
// right away (not the day's cached answer), reinstalls the skill with the
// latest version when the installed one is older, and lists what it cannot
// change itself: an MCP configuration, AGENTS.md lines, a global install.

import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { checkForUpdate, isNewer, runMode } from './update.js';

export const DEFAULT_SKILL_DIR = join(homedir(), '.claude', 'skills', 'md2pdf');

async function installedSkillVersion(dir) {
    try {
        const text = await readFile(join(dir, 'SKILL.md'), 'utf8');
        return text.match(/^# md2pdf \(skill (\d+\.\d+\.\d+)\)/m)?.[1] || 'unknown';
    } catch (_) {
        return null;
    }
}

// The new version writes its own skill, so the text always matches its CLI.
function installWithNpx(version, dir) {
    const windows = process.platform === 'win32';
    const result = spawnSync(windows ? 'npx.cmd' : 'npx', ['-y', 'md2pdf-studio@' + version, 'skill', '--install', '--dir', windows ? '"' + dir + '"' : dir], {
        stdio: ['ignore', 'ignore', 'inherit'],
        shell: windows,
    });
    if (result.status !== 0) throw new Error('Could not install the skill from md2pdf-studio@' + version);
}

export async function upgrade({
    dir = DEFAULT_SKILL_DIR,
    check = () => checkForUpdate({ fresh: true, enabled: true }),
    install = installWithNpx,
    mode = runMode(),
} = {}) {
    const found = await check();
    if (!found) throw new Error('Could not reach npm to look for a newer version. Try again later.');
    const { current, latest } = found;
    const lines = [];
    const skill = await installedSkillVersion(dir);
    // "unknown" is a skill without a version line, such as the old text that
    // fetched instructions from the website: always worth replacing.
    if (skill === null) {
        lines.push('No skill installed in ' + dir + '. To install it: npx -y md2pdf-studio@' + latest + ' skill --install');
    } else if (skill === 'unknown' || isNewer(latest, skill)) {
        await install(latest, dir);
        lines.push('Updated the skill in ' + dir + ' from ' + skill + ' to ' + latest + '. Its commands now use md2pdf-studio@' + latest + '.');
    } else {
        lines.push('The skill in ' + dir + ' is already ' + skill + '.');
    }
    if (found.newer) {
        lines.push('md2pdf-studio ' + latest + ' is available (this is ' + current + '). See what changed: npx -y md2pdf-studio@' + latest + ' changelog');
        lines.push('If you use them, also change md2pdf-studio@' + current + ' to md2pdf-studio@' + latest + ' in your MCP configuration and AGENTS.md.');
        if (mode === 'installed') lines.push('This copy is installed: npm install -g md2pdf-studio@' + latest);
    } else {
        lines.push('md2pdf-studio ' + current + ' is the latest version.');
    }
    return { current, latest, skill: skill === null ? null : { dir, was: skill, now: latest }, text: lines.join('\n') };
}
