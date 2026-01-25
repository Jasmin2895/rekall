#!/usr/bin/env node
import { Command } from 'commander';
import { contextCommand } from './commands/context.js';
import { prCommand } from './commands/pr.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('rekall')
  .description('Remember where you were - Context recovery for developers')
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

program.parse();
