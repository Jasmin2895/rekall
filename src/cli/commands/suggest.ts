import chalk from 'chalk';
import { exec } from '../../utils/shell.js';
import { isGitRepository } from '../../utils/config.js';

interface SuggestCommandOptions {
  format?: 'text' | 'json';
  type?: 'commit' | 'branch';
}

async function getStagedDiff(): Promise<string> {
  try {
    const diff = await exec('git diff --cached --stat');
    return diff || '';
  } catch {
    return '';
  }
}

async function getStagedDiffContent(): Promise<string> {
  try {
    // Get a summary of changes, limited to prevent huge outputs
    const diff = await exec('git diff --cached --no-color');
    // Limit to first 2000 characters to avoid overwhelming the AI
    return diff?.substring(0, 2000) || '';
  } catch {
    return '';
  }
}

async function getUnstagedChanges(): Promise<string> {
  try {
    const status = await exec('git status --porcelain');
    return status || '';
  } catch {
    return '';
  }
}

async function getCurrentBranch(): Promise<string> {
  try {
    const branch = await exec('git branch --show-current');
    return branch?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function suggestWithCopilot(prompt: string): Promise<{ suggestion: string; usedCopilot: boolean }> {
  const escapedPrompt = prompt
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');

  // Try gh copilot explain
  try {
    const result = await exec(`gh copilot explain "${escapedPrompt}"`);
    if (result && !result.includes('not installed') && !result.includes('unknown command')) {
      return { suggestion: result.trim(), usedCopilot: true };
    }
  } catch {
    // Try alternative
  }

  // Try gh copilot suggest
  try {
    const result = await exec(`gh copilot suggest "${escapedPrompt}"`);
    if (result && !result.includes('not installed') && !result.includes('unknown command')) {
      return { suggestion: result.trim(), usedCopilot: true };
    }
  } catch {
    // Copilot not available
  }

  return { suggestion: '', usedCopilot: false };
}

function generateBasicCommitMessage(stagedDiff: string, diffContent: string): string[] {
  const suggestions: string[] = [];
  const files = stagedDiff.split('\n').filter(l => l.includes('|'));
  const fileNames = files.map(f => f.split('|')[0].trim());

  // Analyze file patterns
  const hasTests = fileNames.some(f => f.includes('test') || f.includes('spec'));
  const hasDocs = fileNames.some(f => f.endsWith('.md') || f.includes('doc'));
  const hasConfig = fileNames.some(f =>
    f.includes('config') || f.includes('package.json') || f.includes('.env') ||
    f.includes('tsconfig') || f.includes('eslint')
  );
  const hasStyles = fileNames.some(f => f.endsWith('.css') || f.endsWith('.scss'));

  // Analyze diff content for keywords
  const content = diffContent.toLowerCase();
  const hasFix = content.includes('fix') || content.includes('bug');
  const hasFeature = content.includes('add') || content.includes('new') || content.includes('feature');

  // Generate suggestions based on patterns
  if (files.length === 1) {
    const fileName = fileNames[0].split('/').pop() || fileNames[0];
    if (hasFix) {
      suggestions.push(`fix: resolve issue in ${fileName}`);
    } else if (hasFeature) {
      suggestions.push(`feat: add functionality to ${fileName}`);
    } else {
      suggestions.push(`update: modify ${fileName}`);
    }
  } else {
    // Multiple files
    if (hasTests && !hasDocs) {
      suggestions.push('test: add/update test coverage');
    }
    if (hasDocs) {
      suggestions.push('docs: update documentation');
    }
    if (hasConfig) {
      suggestions.push('chore: update configuration');
    }
    if (hasStyles) {
      suggestions.push('style: update styling');
    }
    if (hasFix) {
      suggestions.push('fix: resolve issues across multiple files');
    }
    if (hasFeature) {
      suggestions.push('feat: implement new functionality');
    }
  }

  // Default suggestion if none matched
  if (suggestions.length === 0) {
    if (files.length === 1) {
      suggestions.push(`update: modify ${fileNames[0].split('/').pop()}`);
    } else {
      suggestions.push(`update: modify ${files.length} files`);
    }
  }

  // Add a generic option
  suggestions.push(`chore: update ${files.length} file${files.length > 1 ? 's' : ''}`);

  return [...new Set(suggestions)].slice(0, 3);
}

function generateBasicBranchName(description: string): string[] {
  const words = description.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 4);

  const suggestions: string[] = [];

  if (words.length > 0) {
    suggestions.push(`feature/${words.join('-')}`);
    suggestions.push(`feat/${words.join('-')}`);
    if (words.some(w => w.includes('fix') || w.includes('bug'))) {
      suggestions.push(`fix/${words.filter(w => !['fix', 'bug'].includes(w)).join('-')}`);
    }
  }

  return suggestions.length > 0 ? suggestions : ['feature/new-feature'];
}

export async function suggestCommand(description: string | undefined, options: SuggestCommandOptions): Promise<void> {
  const isJSON = options.format === 'json';
  const suggestionType = options.type || 'commit';

  if (!isGitRepository()) {
    if (isJSON) {
      console.log(JSON.stringify({ error: 'Not a git repository' }));
    } else {
      console.log(chalk.red('\n  ✖ Error: Not a git repository. Run this command from a git project.\n'));
    }
    process.exit(1);
  }

  try {
    if (suggestionType === 'branch') {
      // Branch name suggestion
      if (!description) {
        if (isJSON) {
          console.log(JSON.stringify({ error: 'Please provide a description for the branch' }));
        } else {
          console.log(chalk.red('\n  ✖ Error: Please provide a description for the branch.\n'));
          console.log(chalk.dim('  Usage: rekall suggest "add user authentication" --type branch\n'));
        }
        process.exit(1);
      }

      if (!isJSON) {
        process.stdout.write(chalk.dim('  ⏳ Generating branch name suggestions...'));
      }

      const prompt = `Suggest 3 good git branch names for this feature/task: "${description}".
Use conventional formats like feature/, fix/, chore/. Keep names short and kebab-case.
Just list the branch names, one per line.`;

      const { suggestion, usedCopilot } = await suggestWithCopilot(prompt);

      if (!isJSON) {
        process.stdout.write('\r\x1b[K');
      }

      const suggestions = usedCopilot
        ? suggestion.split('\n').filter(Boolean).slice(0, 3)
        : generateBasicBranchName(description);

      if (isJSON) {
        console.log(JSON.stringify({
          type: 'branch',
          description,
          suggestions,
          poweredBy: usedCopilot ? 'github-copilot' : 'basic-analysis'
        }, null, 2));
      } else {
        console.log('');
        console.log(chalk.bold.cyan('  🌿 BRANCH NAME SUGGESTIONS'));
        console.log(chalk.dim('─'.repeat(60)));
        console.log('');
        suggestions.forEach((s, i) => {
          console.log(chalk.white(`  ${i + 1}. ${chalk.green(s)}`));
        });
        console.log('');
        console.log(chalk.dim('  Create with: git checkout -b <branch-name>'));
        console.log(chalk.dim('─'.repeat(60)));
        if (usedCopilot) {
          console.log(chalk.green('  ✨ Powered by GitHub Copilot CLI'));
        } else {
          console.log(chalk.dim('  Note: GitHub Copilot CLI not available, using basic analysis'));
        }
        console.log('');
      }
    } else {
      // Commit message suggestion
      if (!isJSON) {
        process.stdout.write(chalk.dim('  ⏳ Analyzing staged changes...'));
      }

      const [stagedDiff, diffContent, branch] = await Promise.all([
        getStagedDiff(),
        getStagedDiffContent(),
        getCurrentBranch()
      ]);

      if (!stagedDiff) {
        if (!isJSON) {
          process.stdout.write('\r\x1b[K');
        }

        // Check if there are unstaged changes
        const unstaged = await getUnstagedChanges();

        if (isJSON) {
          console.log(JSON.stringify({
            error: 'No staged changes',
            hint: unstaged ? 'You have unstaged changes. Run: git add <files>' : 'No changes to commit'
          }));
        } else {
          console.log('');
          console.log(chalk.yellow('  ⚠ No staged changes found.'));
          if (unstaged) {
            console.log(chalk.dim('  You have unstaged changes. Stage them first:'));
            console.log(chalk.dim('  git add <files>'));
          } else {
            console.log(chalk.dim('  No changes to commit.'));
          }
          console.log('');
        }
        process.exit(1);
      }

      if (!isJSON) {
        process.stdout.write('\r\x1b[K');
        process.stdout.write(chalk.dim('  ⏳ Asking GitHub Copilot for commit message...'));
      }

      const prompt = `Suggest 3 good git commit messages for these staged changes. Use conventional commit format (feat:, fix:, chore:, docs:, etc).
Keep messages concise (under 72 chars). Just list the commit messages, one per line.

Branch: ${branch}

Staged files:
${stagedDiff}

Diff preview:
${diffContent.substring(0, 1000)}`;

      const { suggestion, usedCopilot } = await suggestWithCopilot(prompt);

      if (!isJSON) {
        process.stdout.write('\r\x1b[K');
      }

      const suggestions = usedCopilot
        ? suggestion.split('\n').filter(Boolean).map(s => s.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '')).slice(0, 3)
        : generateBasicCommitMessage(stagedDiff, diffContent);

      if (isJSON) {
        console.log(JSON.stringify({
          type: 'commit',
          branch,
          stagedFiles: stagedDiff.split('\n').filter(l => l.includes('|')).length,
          suggestions,
          poweredBy: usedCopilot ? 'github-copilot' : 'basic-analysis'
        }, null, 2));
      } else {
        console.log('');
        console.log(chalk.bold.cyan('  💬 COMMIT MESSAGE SUGGESTIONS'));
        console.log(chalk.dim('─'.repeat(60)));
        console.log('');
        suggestions.forEach((s, i) => {
          console.log(chalk.white(`  ${i + 1}. ${chalk.yellow(s)}`));
        });
        console.log('');
        console.log(chalk.dim('  Commit with: git commit -m "<message>"'));
        console.log(chalk.dim('─'.repeat(60)));
        if (usedCopilot) {
          console.log(chalk.green('  ✨ Powered by GitHub Copilot CLI'));
        } else {
          console.log(chalk.dim('  Note: GitHub Copilot CLI not available, using basic analysis'));
        }
        console.log('');
      }
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
