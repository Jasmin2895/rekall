import { collectOnboardContext } from '../../collectors/onboard.js';
import { renderOnboardContext, renderOnboardJSON, renderError } from '../renderer.js';

interface OnboardCommandOptions {
  format?: 'text' | 'json';
}

export async function onboardCommand(options: OnboardCommandOptions): Promise<void> {
  const isJSON = options.format === 'json';

  try {
    const ctx = await collectOnboardContext();

    if (isJSON) {
      renderOnboardJSON(ctx);
    } else {
      renderOnboardContext(ctx);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    if (isJSON) {
      console.log(JSON.stringify({ error: message }));
    } else {
      renderError(message);
    }
    process.exit(1);
  }
}
