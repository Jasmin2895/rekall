import { AggregatedContext } from '../types/index.js';

export function buildPersonalContextPrompt(ctx: AggregatedContext): string {
  const commits = ctx.git.recentCommits
    .slice(0, 5)
    .map(c => `- ${c.hash}: ${c.message}`)
    .join('\n');

  const changes = ctx.git.uncommittedChanges
    .slice(0, 10)
    .map(f => `- [${f.status}] ${f.path}`)
    .join('\n');

  const todos = ctx.code?.todos
    .slice(0, 5)
    .map(t => `- ${t.file}:${t.line}: ${t.type}: ${t.text}`)
    .join('\n') || 'None found';

  const stashes = ctx.git.stashes
    .map(s => `- stash@{${s.index}}: ${s.message}`)
    .join('\n') || 'None';

  return `
You are analyzing a developer's project to help them remember where they left off.
Be concise and specific. Reference actual file names and commit messages.

PROJECT: ${ctx.projectInfo.name}
TYPE: ${ctx.projectInfo.type}
CURRENT BRANCH: ${ctx.git.branch}
DAYS SINCE LAST COMMIT: ${ctx.git.daysSinceLastCommit === 0 ? 'Today' : ctx.git.daysSinceLastCommit === -1 ? 'Unknown' : `${ctx.git.daysSinceLastCommit} days ago`}

RECENT COMMITS:
${commits || 'No recent commits'}

UNCOMMITTED CHANGES:
${changes || 'No uncommitted changes'}

STASHES:
${stashes}

TODO/FIXME COMMENTS:
${todos}

Based on this context, provide a brief analysis in this exact format:

SUMMARY: [One sentence describing what they were working on]

NEXT STEP: [The most logical next action to take]

BLOCKERS: [Any issues they should address first, or "None" if clear to proceed]
`.trim();
}

export function buildPRContextPrompt(ctx: AggregatedContext): string {
  const pr = ctx.pr!;

  const commits = pr.commits
    .map(c => `- ${c.hash}: ${c.message}`)
    .join('\n');

  const files = pr.files
    .map(f => `- ${f.path} (+${f.additions || 0} -${f.deletions || 0})`)
    .join('\n');

  const totalAdditions = pr.files.reduce((sum, f) => sum + (f.additions || 0), 0);
  const totalDeletions = pr.files.reduce((sum, f) => sum + (f.deletions || 0), 0);

  return `
You are helping a developer efficiently review a pull request.
Be specific and reference actual file names. Focus on what matters for code review.

PR #${pr.number}: "${pr.title}"
AUTHOR: @${pr.author}
BRANCH: ${pr.headBranch} → ${pr.baseBranch}
STATS: ${pr.files.length} files changed, +${totalAdditions} -${totalDeletions}

DESCRIPTION:
${pr.body || 'No description provided'}

COMMITS (${pr.commits.length}):
${commits}

FILES CHANGED:
${files}

Analyze this PR and provide a review guide in this exact format:

SUMMARY: [2-3 sentences explaining what this PR does and why]

HIGH_RISK: [List files that need careful review - core logic, security-sensitive, complex changes. One per line starting with "- "]

LOW_RISK: [List files that can be skimmed - tests, config, mechanical changes. One per line starting with "- "]

QUESTIONS: [2-3 specific questions the reviewer should consider. One per line starting with "- "]

RED_FLAGS: [Any concerns or potential issues, or "None detected" if the PR looks good]
`.trim();
}
