import { gatherPersonalContext, synthesizeWithCopilot } from '../../engine/index.js';
import { renderPersonalContext, renderError, renderLoading, clearLoading, renderJSON } from '../renderer.js';
import { isGitRepository } from '../../utils/config.js';

interface ContextCommandOptions {
  format?: 'text' | 'json';
}

export async function contextCommand(options: ContextCommandOptions): Promise<void> {
  const isJSON = options.format === 'json';

  // Check if we're in a git repository
  if (!isGitRepository()) {
    if (isJSON) {
      console.log(JSON.stringify({ error: 'Not a git repository' }));
    } else {
      renderError('Not a git repository. Run this command from a git project.');
    }
    process.exit(1);
  }

  try {
    if (!isJSON) renderLoading('Gathering context');

    // Gather all context
    const ctx = await gatherPersonalContext();

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
      renderPersonalContext(result, ctx);
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
