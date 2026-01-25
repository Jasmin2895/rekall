import { gatherPersonalContext, synthesizeWithCopilot } from '../../engine/index.js';
import { renderPersonalContext, renderError, renderLoading, clearLoading } from '../renderer.js';
import { isGitRepository } from '../../utils/config.js';

export async function contextCommand(): Promise<void> {
  // Check if we're in a git repository
  if (!isGitRepository()) {
    renderError('Not a git repository. Run this command from a git project.');
    process.exit(1);
  }

  try {
    renderLoading('Gathering context');

    // Gather all context
    const ctx = await gatherPersonalContext();

    clearLoading();
    renderLoading('Analyzing with Copilot');

    // Synthesize with Copilot CLI
    const result = await synthesizeWithCopilot(ctx);

    clearLoading();

    // Render the output
    renderPersonalContext(result, ctx);
  } catch (error) {
    clearLoading();
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    renderError(message);
    process.exit(1);
  }
}
