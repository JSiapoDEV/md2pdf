#!/usr/bin/env node
// Keeps the Claude plugin in plugin/ in step with what the site and npm serve:
// the skill text of public/skill.md (with the plugin's own "Newer versions"
// section), and the CLI's version in the manifest and in bin/md2pdf-studio.
// Run it after changing the skill or releasing a new md2pdf-studio:
// npm run plugin
import { readFileSync, writeFileSync } from 'node:fs';
import { pluginSkill } from './plugin-skill.mjs';

const root = new URL('../', import.meta.url);
const version = JSON.parse(readFileSync(new URL('cli/package.json', root), 'utf8')).version;
writeFileSync(new URL('plugin/skills/md2pdf/SKILL.md', root), pluginSkill(readFileSync(new URL('public/skill.md', root), 'utf8')));
const manifestUrl = new URL('plugin/.claude-plugin/plugin.json', root);
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
manifest.version = version;
writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
const binUrl = new URL('plugin/bin/md2pdf-studio', root);
writeFileSync(binUrl, readFileSync(binUrl, 'utf8').replace(/md2pdf-studio@\d+\.\d+\.\d+/g, 'md2pdf-studio@' + version));
console.log('plugin/ synced: skill from public/skill.md, version ' + version);
