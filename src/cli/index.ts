#!/usr/bin/env node
import { Command } from 'commander';
import { contextCommand } from './commands/context.js';
import { prCommand } from './commands/pr.js';
import { explainCommand } from './commands/explain.js';
import { suggestCommand } from './commands/suggest.js';
import { onboardCommand } from './commands/onboard.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('rekall')
  .description('Remember where you were - Context recovery for developers. Powered by GitHub Copilot CLI.')
  .version(pkg.version);

// Personal context mode
program
  .command('context', { isDefault: true })
  .description('Show personal context for current project')
  .option('-f, --format <format>', 'Output format: text or json', 'text')
  .action(contextCommand);

// PR review mode
program
  .command('pr <number>')
  .description('Analyze a PR before reviewing')
  .option('-r, --repo <repo>', 'Repository in owner/repo format')
  .option('-f, --format <format>', 'Output format: text or json', 'text')
  .action(prCommand);

// Explain recent changes using Copilot
program
  .command('explain')
  .description('Explain recent changes using GitHub Copilot CLI')
  .option('-f, --format <format>', 'Output format: text or json', 'text')
  .option('-n, --commits <number>', 'Number of commits to analyze', '5')
  .action((options) => explainCommand({ ...options, commits: parseInt(options.commits, 10) }));

// Suggest commit messages or branch names using Copilot
program
  .command('suggest [description]')
  .description('Suggest commit messages or branch names using GitHub Copilot CLI')
  .option('-f, --format <format>', 'Output format: text or json', 'text')
  .option('-t, --type <type>', 'Suggestion type: commit or branch', 'commit')
  .action(suggestCommand);

// Onboard - quick project overview for newcomers
program
  .command('onboard')
  .description('Quick project overview for newcomers')
  .option('-f, --format <format>', 'Output format: text or json', 'text')
  .action(onboardCommand);

program.parse();
