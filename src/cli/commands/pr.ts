import { gatherPRContext, synthesizeWithCopilot } from '../../engine/index.js';
import { renderPRContext, renderError, renderLoading, clearLoading, renderJSON } from '../renderer.js';
import { isPRAvailable } from '../../collectors/github.js';
import { isCommandAvailable } from '../../utils/shell.js';

interface PRCommandOptions {
  repo?: string;
  format?: 'text' | 'json';
}

export async function prCommand(prNumber: string, options: PRCommandOptions): Promise<void> {
  const num = parseInt(prNumber, 10);
  const isJSON = options.format === 'json';

  if (isNaN(num) || num <= 0) {
    if (isJSON) {
      console.log(JSON.stringify({ error: 'Invalid PR number' }));
    } else {
      renderError('Invalid PR number. Please provide a valid positive integer.');
    }
    process.exit(1);
  }

  // Check if gh CLI is available
  if (!await isCommandAvailable('gh')) {
    if (isJSON) {
      console.log(JSON.stringify({ error: 'GitHub CLI (gh) is not installed' }));
    } else {
      renderError('GitHub CLI (gh) is not installed. Please install it first: https://cli.github.com');
    }
    process.exit(1);
  }

  try {
    if (!isJSON) renderLoading('Checking PR access');

    // Check if PR exists and is accessible
    if (!await isPRAvailable(num, options.repo)) {
      if (!isJSON) clearLoading();
      if (isJSON) {
        console.log(JSON.stringify({ error: `PR #${num} not found or not accessible` }));
      } else {
        renderError(`PR #${num} not found or not accessible. Make sure you're authenticated with 'gh auth login'.`);
      }
      process.exit(1);
    }

    if (!isJSON) {
      clearLoading();
      renderLoading('Fetching PR details');
    }

    // Gather PR context
    const ctx = await gatherPRContext(num, options.repo);

    if (!isJSON) {
      clearLoading();
      renderLoading('Analyzing with Copilot');
    }

    // Synthesize with Copilot CLI
    const result = await synthesizeWithCopilot(ctx);

    if (!isJSON) clearLoading();

    // Render the output
    if (isJSON) {
      renderJSON(result, ctx);
    } else {
      renderPRContext(result, ctx);
    }
  } catch (error) {
    if (!isJSON) clearLoading();
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    if (isJSON) {
      console.log(JSON.stringify({ error: message }));
    } else {
      renderError(message);
    }
    process.exit(1);
  }
}
