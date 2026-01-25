import { AggregatedContext } from '../types/index.js';
import { collectGitContext, collectPRContext, collectCodeContext } from '../collectors/index.js';
import { detectProject } from '../utils/config.js';

export async function gatherPersonalContext(): Promise<AggregatedContext> {
  const projectInfo = detectProject();

  const [git, code] = await Promise.all([
    collectGitContext(),
    collectCodeContext(),
  ]);

  return {
    mode: 'personal',
    git,
    code,
    projectInfo,
  };
}

export async function gatherPRContext(prNumber: number, repo?: string): Promise<AggregatedContext> {
  const projectInfo = detectProject();

  const [git, pr] = await Promise.all([
    collectGitContext(),
    collectPRContext(prNumber, repo),
  ]);

  return {
    mode: 'pr',
    git,
    pr,
    projectInfo,
  };
}
