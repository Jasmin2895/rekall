#!/usr/bin/env node
import { Command } from 'commander';
import { contextCommand } from './commands/context.js';
import { prCommand } from './commands/pr.js';

const program = new Command();

program
  .name('rekall')
  .description('Remember where you were - Context recovery for developers')
  .version('1.0.0');

// PR review mode
program
  .command('pr <number>')
  .description('Analyze a PR before reviewing')
  .option('-r, --repo <repo>', 'Repository in owner/repo format')
  .action(prCommand);

// Default command (personal context) - runs when no subcommand is provided
program
  .action(contextCommand);

program.parse();
