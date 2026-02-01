import chalk from 'chalk';
import { SynthesisResult, AggregatedContext } from '../types/index.js';

function divider(): void {
  console.log(chalk.dim('─'.repeat(60)));
}

function generateChangesSummary(ctx: AggregatedContext): string {
  const changes = ctx.git.uncommittedChanges;
  const added = changes.filter(f => f.status === 'added').length;
  const modified = changes.filter(f => f.status === 'modified').length;
  const deleted = changes.filter(f => f.status === 'deleted').length;

  const parts: string[] = [];
  if (added > 0) parts.push(`${added} new`);
  if (modified > 0) parts.push(`${modified} modified`);
  if (deleted > 0) parts.push(`${deleted} deleted`);

  // Detect patterns in changed files
  const paths = changes.map(f => f.path);
  const hasTests = paths.some(p => p.includes('test') || p.includes('spec'));
  const hasConfig = paths.some(p => p.includes('config') || p.includes('package.json') || p.includes('.env'));
  const hasDocs = paths.some(p => p.endsWith('.md') || p.includes('docs'));

  let context = '';
  if (hasTests && modified > 0) context = ' (includes test updates)';
  else if (hasConfig) context = ' (includes config changes)';
  else if (hasDocs) context = ' (includes documentation)';

  return `You have ${parts.join(', ')} file${changes.length > 1 ? 's' : ''}${context}. These changes are not yet committed.`;
}

function generateStashSummary(ctx: AggregatedContext): string {
  const count = ctx.git.stashes.length;
  return `You have ${count} stashed change${count > 1 ? 's' : ''} saved for later. Consider applying or dropping ${count > 1 ? 'them' : 'it'} if no longer needed.`;
}

function generateBlockersSummary(blockers: string[]): string {
  const hasFixes = blockers.some(b => b.startsWith('FIXME'));
  const hasTodos = blockers.some(b => b.startsWith('TODO'));
  const hasTests = blockers.some(b => b.toLowerCase().includes('test'));

  if (hasFixes) return 'Critical issues marked FIXME require attention before proceeding:';
  if (hasTests) return 'Test failures need to be addressed:';
  if (hasTodos) return 'Pending tasks found in your code:';
  return 'Issues that may block your progress:';
}

export function renderPersonalContext(result: SynthesisResult, ctx: AggregatedContext): void {
  console.log('');
  console.log(chalk.bold.cyan(`  📍 ${ctx.projectInfo.name}`));
  console.log(chalk.dim(`     Branch: ${ctx.git.branch} | Last active: ${ctx.git.lastCommit.date || 'unknown'}`));

  // Show last commit message for context
  if (ctx.git.lastCommit.message && ctx.git.lastCommit.message !== 'No commits') {
    console.log(chalk.dim(`     Last commit: "${ctx.git.lastCommit.message}"`));
  }

  console.log('');
  divider();

  // Summary
  console.log(chalk.bold('\n  📖 CONTEXT'));
  console.log(chalk.white(`     ${result.summary || 'Unable to determine context'}`));

  // Uncommitted changes
  if (ctx.git.uncommittedChanges.length > 0) {
    console.log(chalk.bold('\n  📝 UNCOMMITTED CHANGES'));
    console.log(chalk.dim(`     ${generateChangesSummary(ctx)}`));
    console.log('');
    ctx.git.uncommittedChanges.slice(0, 5).forEach(f => {
      const statusColor = f.status === 'added' ? chalk.green :
                          f.status === 'deleted' ? chalk.red : chalk.yellow;
      const statusLabel = f.status === 'added' ? ' (new)' :
                          f.status === 'deleted' ? ' (deleted)' : '';
      console.log(`     ${statusColor('•')} ${f.path}${chalk.dim(statusLabel)}`);
    });
    if (ctx.git.uncommittedChanges.length > 5) {
      console.log(chalk.dim(`     ... and ${ctx.git.uncommittedChanges.length - 5} more files`));
    }
  }

  // Stashes
  if (ctx.git.stashes.length > 0) {
    console.log(chalk.bold('\n  📦 STASHES'));
    console.log(chalk.dim(`     ${generateStashSummary(ctx)}`));
    console.log('');
    ctx.git.stashes.slice(0, 3).forEach(s => {
      console.log(chalk.dim(`     • ${s.message}`));
    });
  }

  // Blockers
  if (result.blockers && result.blockers.length > 0) {
    console.log(chalk.bold.red('\n  ⚠️  BLOCKERS'));
    console.log(chalk.dim(`     ${generateBlockersSummary(result.blockers)}`));
    console.log('');
    result.blockers.forEach(b => {
      console.log(chalk.red(`     • ${b}`));
    });
  }

  // Next step
  console.log(chalk.bold.green('\n  ➡️  SUGGESTED NEXT STEP'));
  console.log(chalk.white(`     ${result.nextStep || 'Continue where you left off'}`));

  console.log('');
  divider();

  if (result.fallbackMode === false) {
    console.log(chalk.green('  ✨ Powered by GitHub Copilot CLI'));
  } else if (result.fallbackMode) {
    console.log(chalk.dim('  Note: GitHub Copilot CLI not available, using basic analysis'));
    console.log(chalk.dim('  Install: gh extension install github/gh-copilot'));
  }

  console.log('');
}

export function renderPRContext(result: SynthesisResult, ctx: AggregatedContext): void {
  const pr = ctx.pr!;
  const totalAdditions = pr.files.reduce((sum, f) => sum + (f.additions || 0), 0);
  const totalDeletions = pr.files.reduce((sum, f) => sum + (f.deletions || 0), 0);

  console.log('');
  console.log(chalk.bold.cyan(`  🔍 PR #${pr.number}: "${pr.title}"`));
  console.log(chalk.dim(`     Author: @${pr.author} | ${pr.commits.length} commits | ${pr.files.length} files | +${totalAdditions} -${totalDeletions}`));
  console.log('');
  divider();

  // Summary
  console.log(chalk.bold('\n  📖 SUMMARY'));
  console.log(chalk.white(`     ${result.summary || pr.body?.substring(0, 200) || 'No description'}`));

  // Review Priority
  console.log(chalk.bold('\n  🎯 REVIEW PRIORITY'));

  if (result.highRiskFiles && result.highRiskFiles.length > 0) {
    console.log(chalk.red('     ⚠️  HIGH RISK (review carefully):'));
    result.highRiskFiles.slice(0, 5).forEach(f => {
      console.log(chalk.red(`        • ${f}`));
    });
  }

  if (result.lowRiskFiles && result.lowRiskFiles.length > 0) {
    console.log(chalk.green('     ✅ LOW RISK (skim):'));
    result.lowRiskFiles.slice(0, 5).forEach(f => {
      console.log(chalk.dim(`        • ${f}`));
    });
  }

  // Questions
  if (result.questions && result.questions.length > 0) {
    console.log(chalk.bold('\n  🤔 REVIEW QUESTIONS'));
    result.questions.forEach(q => {
      console.log(chalk.white(`     • ${q}`));
    });
  }

  // Red Flags
  if (result.blockers && result.blockers.length > 0) {
    console.log(chalk.bold.red('\n  🚩 RED FLAGS'));
    result.blockers.forEach(b => {
      console.log(chalk.red(`     • ${b}`));
    });
  }

  // Link
  console.log(chalk.bold('\n  🔗 LINK'));
  console.log(chalk.blue(`     ${pr.url}`));

  console.log('');
  divider();

  if (result.fallbackMode === false) {
    console.log(chalk.green('  ✨ Powered by GitHub Copilot CLI'));
  } else if (result.fallbackMode) {
    console.log(chalk.dim('  Note: GitHub Copilot CLI not available, using basic analysis'));
    console.log(chalk.dim('  Install: gh extension install github/gh-copilot'));
  }

  console.log('');
}

export function renderError(message: string): void {
  console.log('');
  console.log(chalk.red(`  ✖ Error: ${message}`));
  console.log('');
}

export function renderJSON(result: SynthesisResult, ctx: AggregatedContext): void {
  const output = {
    mode: ctx.mode,
    project: {
      name: ctx.projectInfo.name,
      type: ctx.projectInfo.type,
      path: ctx.projectInfo.rootPath,
    },
    git: {
      branch: ctx.git.branch,
      lastCommit: ctx.git.lastCommit,
      uncommittedChanges: ctx.git.uncommittedChanges,
      stashes: ctx.git.stashes,
      daysSinceLastCommit: ctx.git.daysSinceLastCommit,
    },
    analysis: {
      summary: result.summary,
      nextStep: result.nextStep,
      blockers: result.blockers,
      highRiskFiles: result.highRiskFiles,
      lowRiskFiles: result.lowRiskFiles,
      questions: result.questions,
    },
    ...(ctx.pr && {
      pr: {
        number: ctx.pr.number,
        title: ctx.pr.title,
        author: ctx.pr.author,
        url: ctx.pr.url,
        baseBranch: ctx.pr.baseBranch,
        headBranch: ctx.pr.headBranch,
        commits: ctx.pr.commits,
        files: ctx.pr.files,
      },
    }),
    ...(ctx.code && {
      code: {
        todos: ctx.code.todos,
        failingTests: ctx.code.failingTests,
      },
    }),
    poweredBy: result.fallbackMode === false ? 'github-copilot' : 'basic-analysis',
  };

  console.log(JSON.stringify(output, null, 2));
}

export function renderLoading(message: string): void {
  process.stdout.write(chalk.dim(`  ⏳ ${message}...`));
}

export function clearLoading(): void {
  process.stdout.write('\r\x1b[K'); // Clear the line
}

// Onboard context rendering
import { OnboardContext } from '../types/index.js';

export function renderOnboardContext(ctx: OnboardContext): void {
  console.log('');
  console.log(chalk.bold.cyan(`  Welcome to project: ${ctx.projectName}`));
  console.log(chalk.dim('  ' + '─'.repeat(35)));

  console.log(`  ${chalk.yellow('🏗️')}  Architecture: ${ctx.architecture}`);

  if (ctx.keyDependencies.length > 0) {
    console.log(`  ${chalk.yellow('📦')}  Key dependencies: ${ctx.keyDependencies.join(', ')}`);
  }

  if (ctx.hotAreas.length > 0) {
    const topArea = ctx.hotAreas[0];
    console.log(`  ${chalk.yellow('🔥')}  Hot areas: ${topArea.directory} (${topArea.commitCount} commits this week)`);
  }

  if (ctx.todoCount > 0) {
    console.log(`  ${chalk.yellow('⚠️')}  Watch out: ${ctx.todoCount} open TODO${ctx.todoCount > 1 ? 's' : ''} in ${ctx.todoLocation}`);
  }

  if (ctx.runCommand) {
    console.log(`  ${chalk.yellow('🚀')}  To run: ${ctx.runCommand}`);
  }

  console.log('');
}

export function renderOnboardJSON(ctx: OnboardContext): void {
  console.log(JSON.stringify(ctx, null, 2));
}
