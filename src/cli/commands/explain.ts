import chalk from 'chalk';
import { exec } from '../../utils/shell.js';
import { isGitRepository } from '../../utils/config.js';
import { getGitContext } from '../../collectors/git.js';

interface ExplainCommandOptions {
  format?: 'text' | 'json';
  commits?: number;
}

async function getRecentDiff(numCommits: number): Promise<string> {
  try {
    const diff = await exec(`git diff HEAD~${numCommits}..HEAD --stat`);
    return diff || 'No changes found';
  } catch {
    // If not enough commits, get all available
    try {
      const diff = await exec('git diff --stat HEAD~1..HEAD');
      return diff || 'No changes found';
    } catch {
      return 'Unable to get diff';
    }
  }
}

async function getCommitMessages(numCommits: number): Promise<string> {
  try {
    const messages = await exec(`git log -${numCommits} --pretty=format:"%h - %s (%cr)"`);
    return messages || 'No commits found';
  } catch {
    return 'Unable to get commit history';
  }
}

async function explainWithCopilot(prompt: string): Promise<{ explanation: string; usedCopilot: boolean }> {
  // Escape the prompt for shell
  const escapedPrompt = prompt
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');

  // Try gh copilot -p syntax (current)
  try {
    const result = await exec(`gh copilot -p "${escapedPrompt}"`);
    if (result && !result.includes('not installed') && !result.includes('unknown command')) {
      return { explanation: result.trim(), usedCopilot: true };
    }
  } catch {
    // Try legacy syntax
  }

  // Try legacy gh copilot explain syntax
  try {
    const result = await exec(`gh copilot explain "${escapedPrompt}"`);
    if (result && !result.includes('not installed') && !result.includes('unknown command')) {
      return { explanation: result.trim(), usedCopilot: true };
    }
  } catch {
    // Copilot not available
  }

  return { explanation: '', usedCopilot: false };
}

function generateBasicExplanation(commits: string, diff: string, branch: string): string {
  const lines = commits.split('\n').filter(Boolean);
  const fileChanges = diff.split('\n').filter(l => l.includes('|')).length;

  let explanation = `Recent development on branch "${branch}":\n\n`;
  explanation += `📝 ${lines.length} commit(s) analyzed:\n`;
  lines.slice(0, 5).forEach(line => {
    explanation += `   • ${line}\n`;
  });

  if (fileChanges > 0) {
    explanation += `\n📁 ${fileChanges} file(s) changed in this period.`;
  }

  // Extract patterns from commit messages
  const messages = lines.join(' ').toLowerCase();
  const patterns: string[] = [];

  if (messages.includes('fix') || messages.includes('bug')) patterns.push('bug fixes');
  if (messages.includes('add') || messages.includes('feat') || messages.includes('new')) patterns.push('new features');
  if (messages.includes('refactor')) patterns.push('code refactoring');
  if (messages.includes('test')) patterns.push('test updates');
  if (messages.includes('doc')) patterns.push('documentation');
  if (messages.includes('update') || messages.includes('improve')) patterns.push('improvements');

  if (patterns.length > 0) {
    explanation += `\n\n🎯 Work focus: ${patterns.join(', ')}.`;
  }

  return explanation;
}

export async function explainCommand(options: ExplainCommandOptions): Promise<void> {
  const isJSON = options.format === 'json';
  const numCommits = options.commits || 5;

  if (!isGitRepository()) {
    if (isJSON) {
      console.log(JSON.stringify({ error: 'Not a git repository' }));
    } else {
      console.log(chalk.red('\n  ✖ Error: Not a git repository. Run this command from a git project.\n'));
    }
    process.exit(1);
  }

  try {
    if (!isJSON) {
      process.stdout.write(chalk.dim('  ⏳ Gathering recent changes...'));
    }

    const [gitContext, diff, commits] = await Promise.all([
      getGitContext(),
      getRecentDiff(numCommits),
      getCommitMessages(numCommits)
    ]);

    if (!isJSON) {
      process.stdout.write('\r\x1b[K');
      process.stdout.write(chalk.dim('  ⏳ Asking GitHub Copilot to explain...'));
    }

    const prompt = `Explain what a developer has been working on based on these recent git commits and changes. Be concise and highlight the main focus areas.

Branch: ${gitContext.branch}

Recent commits:
${commits}

Files changed:
${diff}

Provide a brief, helpful summary of the recent development work.`;

    const { explanation, usedCopilot } = await explainWithCopilot(prompt);

    if (!isJSON) {
      process.stdout.write('\r\x1b[K');
    }

    const finalExplanation = usedCopilot
      ? explanation
      : generateBasicExplanation(commits, diff, gitContext.branch);

    if (isJSON) {
      console.log(JSON.stringify({
        branch: gitContext.branch,
        commitsAnalyzed: numCommits,
        explanation: finalExplanation,
        poweredBy: usedCopilot ? 'github-copilot' : 'basic-analysis'
      }, null, 2));
    } else {
      console.log('');
      console.log(chalk.bold.cyan('  🔮 COPILOT EXPLANATION'));
      console.log(chalk.dim('─'.repeat(60)));
      console.log('');

      finalExplanation.split('\n').forEach(line => {
        console.log(chalk.white(`  ${line}`));
      });

      console.log('');
      console.log(chalk.dim('─'.repeat(60)));

      if (usedCopilot) {
        console.log(chalk.green('  ✨ Powered by GitHub Copilot CLI'));
      } else {
        console.log(chalk.dim('  Note: GitHub Copilot CLI not available, using basic analysis'));
        console.log(chalk.dim('  Install: gh extension install github/gh-copilot'));
      }
      console.log('');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    if (isJSON) {
      console.log(JSON.stringify({ error: message }));
    } else {
      console.log(chalk.red(`\n  ✖ Error: ${message}\n`));
    }
    process.exit(1);
  }
}
