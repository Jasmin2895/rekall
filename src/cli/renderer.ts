import chalk from 'chalk';
import { SynthesisResult, AggregatedContext } from '../types/index.js';

function divider(): void {
  console.log(chalk.dim('─'.repeat(60)));
}

export function renderPersonalContext(result: SynthesisResult, ctx: AggregatedContext): void {
  console.log('');
  console.log(chalk.bold.cyan(`  📍 ${ctx.projectInfo.name}`));
  console.log(chalk.dim(`     Branch: ${ctx.git.branch} | Last active: ${ctx.git.lastCommit.date || 'unknown'}`));
  console.log('');
  divider();

  // Summary
  console.log(chalk.bold('\n  📖 CONTEXT'));
  console.log(chalk.white(`     ${result.summary || 'Unable to determine context'}`));

  // Uncommitted changes
  if (ctx.git.uncommittedChanges.length > 0) {
    console.log(chalk.bold('\n  📝 UNCOMMITTED CHANGES'));
    ctx.git.uncommittedChanges.slice(0, 5).forEach(f => {
      const statusColor = f.status === 'added' ? chalk.green :
                          f.status === 'deleted' ? chalk.red : chalk.yellow;
      console.log(`     ${statusColor('•')} ${f.path}`);
    });
    if (ctx.git.uncommittedChanges.length > 5) {
      console.log(chalk.dim(`     ... and ${ctx.git.uncommittedChanges.length - 5} more files`));
    }
  }

  // Stashes
  if (ctx.git.stashes.length > 0) {
    console.log(chalk.bold('\n  📦 STASHES'));
    ctx.git.stashes.slice(0, 3).forEach(s => {
      console.log(chalk.dim(`     • ${s.message}`));
    });
  }

  // Blockers
  if (result.blockers && result.blockers.length > 0) {
    console.log(chalk.bold.red('\n  ⚠️  BLOCKERS'));
    result.blockers.forEach(b => {
      console.log(chalk.red(`     • ${b}`));
    });
  }

  // Next step
  console.log(chalk.bold.green('\n  ➡️  SUGGESTED NEXT STEP'));
  console.log(chalk.white(`     ${result.nextStep || 'Continue where you left off'}`));

  console.log('');
  divider();

  if (result.fallbackMode) {
    console.log(chalk.dim('  Note: GitHub Copilot CLI not available, using basic analysis'));
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

  if (result.fallbackMode) {
    console.log(chalk.dim('  Note: GitHub Copilot CLI not available, using basic analysis'));
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
  };

  console.log(JSON.stringify(output, null, 2));
}

export function renderLoading(message: string): void {
  process.stdout.write(chalk.dim(`  ⏳ ${message}...`));
}

export function clearLoading(): void {
  process.stdout.write('\r\x1b[K'); // Clear the line
}
