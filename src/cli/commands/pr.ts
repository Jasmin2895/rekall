import { gatherPRContext, synthesizeWithCopilot } from '../../engine/index.js';
import { renderPRContext, renderError, renderLoading, clearLoading } from '../renderer.js';
import { isPRAvailable } from '../../collectors/github.js';
import { isCommandAvailable } from '../../utils/shell.js';

interface PRCommandOptions {
  repo?: string;
}

export async function prCommand(prNumber: string, options: PRCommandOptions): Promise<void> {
  const num = parseInt(prNumber, 10);

  if (isNaN(num) || num <= 0) {
    renderError('Invalid PR number. Please provide a valid positive integer.');
    process.exit(1);
  }

  // Check if gh CLI is available
  if (!await isCommandAvailable('gh')) {
    renderError('GitHub CLI (gh) is not installed. Please install it first: https://cli.github.com');
    process.exit(1);
  }

  try {
    renderLoading('Checking PR access');

    // Check if PR exists and is accessible
    if (!await isPRAvailable(num, options.repo)) {
      clearLoading();
      renderError(`PR #${num} not found or not accessible. Make sure you're authenticated with 'gh auth login'.`);
      process.exit(1);
    }

    clearLoading();
    renderLoading('Fetching PR details');

    // Gather PR context
    const ctx = await gatherPRContext(num, options.repo);

    clearLoading();
    renderLoading('Analyzing with Copilot');

    // Synthesize with Copilot CLI
    const result = await synthesizeWithCopilot(ctx);

    clearLoading();

    // Render the output
    renderPRContext(result, ctx);
  } catch (error) {
    clearLoading();
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    renderError(message);
    process.exit(1);
  }
}
