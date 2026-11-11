// The plugin's copy of the skill differs from public/skill.md in one section.
// The plugin pins the tool and updates through Claude Code's plugin directory,
// so its skill must not run `upgrade`, which installs a separate copy of the
// skill in ~/.claude/skills.

const PLUGIN_NEWER_VERSIONS = `## Newer versions

This skill comes from the md2pdf plugin for Claude Code, which pins the tool to the version above. The help, \`--version\`, \`share\`, \`update\` and \`list\` say when a newer version exists. If one does, tell the user that the plugin brings it when it updates, which they can check in \`/plugin\`. Do not run \`upgrade\`: it would install a second copy of this skill.
`;

export function pluginSkill(siteSkill) {
    const section = /## Newer versions\n\n[\s\S]*?(?=\n## )/;
    if (!section.test(siteSkill)) throw new Error('public/skill.md has no "## Newer versions" section');
    return siteSkill.replace(section, PLUGIN_NEWER_VERSIONS);
}
