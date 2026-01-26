import { SynthesisResult, AggregatedContext } from '../types/index.js';
import { exec } from '../utils/shell.js';
import { buildPersonalContextPrompt, buildPRContextPrompt } from './prompt-builder.js';

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 'is');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractList(text: string, sectionName: string): string[] {
  const section = extractSection(text, sectionName);
  if (!section || section.toLowerCase() === 'none' || section.toLowerCase() === 'none detected') {
    return [];
  }

  return section
    .split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function parsePersonalResponse(raw: string): SynthesisResult {
  return {
    summary: extractSection(raw, 'SUMMARY'),
    nextStep: extractSection(raw, 'NEXT_STEP') || extractSection(raw, 'NEXT STEP'),
    blockers: extractList(raw, 'BLOCKERS'),
  };
}

function parsePRResponse(raw: string): SynthesisResult {
  return {
    summary: extractSection(raw, 'SUMMARY'),
    highRiskFiles: extractList(raw, 'HIGH_RISK'),
    lowRiskFiles: extractList(raw, 'LOW_RISK'),
    questions: extractList(raw, 'QUESTIONS'),
    blockers: extractList(raw, 'RED_FLAGS'),
  };
}

function isCopilotError(result: string): boolean {
  const errorPatterns = ['not installed', 'Quota exceeded', 'no quota', 'Execution failed', '402', '401', 'unauthorized'];
  return errorPatterns.some(p => result.includes(p));
}

async function tryCopilotCLI(prompt: string): Promise<string | null> {
  // Escape the prompt for shell
  const escapedPrompt = prompt
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');

  // Try new gh copilot syntax first
  try {
    const result = await exec(`gh copilot -p "${escapedPrompt}"`);
    if (result && !isCopilotError(result)) {
      return result;
    }
  } catch {
    // Try legacy syntax
  }

  // Try legacy gh copilot explain syntax
  try {
    const result = await exec(`gh copilot explain "${escapedPrompt}"`);
    if (result && !isCopilotError(result)) {
      return result;
    }
  } catch {
    // Copilot not available
  }

  return null;
}

function generateSmartBasicAnalysis(ctx: AggregatedContext): SynthesisResult {
  if (ctx.mode === 'personal') {
    const { git, code } = ctx;
    const hasChanges = git.uncommittedChanges.length > 0;
    const hasStashes = git.stashes.length > 0;
    const hasTodos = (code?.todos.length || 0) > 0;
    const daysSince = git.daysSinceLastCommit;

    // Build intelligent summary
    let summary = `Working on branch "${git.branch}"`;
    if (hasChanges) {
      summary += ` with ${git.uncommittedChanges.length} uncommitted change${git.uncommittedChanges.length > 1 ? 's' : ''}`;
    }
    if (daysSince > 7) {
      summary += `. Last commit was ${daysSince} days ago`;
    }
    summary += '.';

    // Determine smart next step
    let nextStep: string;
    if (hasChanges) {
      const modifiedFiles = git.uncommittedChanges.filter(f => f.status === 'modified');
      const addedFiles = git.uncommittedChanges.filter(f => f.status === 'added');

      if (addedFiles.length > 0) {
        nextStep = `Review and commit new file: ${addedFiles[0].path}`;
      } else if (modifiedFiles.length > 0) {
        nextStep = `Review and commit changes to: ${modifiedFiles[0].path}`;
      } else {
        nextStep = `Review and commit changes to: ${git.uncommittedChanges[0].path}`;
      }
    } else if (hasStashes) {
      nextStep = `Apply stashed changes: "${git.stashes[0].message}"`;
    } else if (hasTodos) {
      nextStep = `Address TODO: ${code!.todos[0].text}`;
    } else {
      nextStep = 'Continue development';
    }

    // Collect blockers with details
    const blockers: string[] = [];
    if (hasTodos) {
      const todos = code!.todos;
      const fixmes = todos.filter(t => t.type === 'FIXME');
      const regularTodos = todos.filter(t => t.type === 'TODO');

      // Show FIXME items first (higher priority)
      fixmes.slice(0, 3).forEach(t => {
        const shortPath = t.file.split('/').slice(-2).join('/');
        blockers.push(`FIXME in ${shortPath}:${t.line} - ${t.text}`);
      });

      // Then show TODO items
      regularTodos.slice(0, 3).forEach(t => {
        const shortPath = t.file.split('/').slice(-2).join('/');
        blockers.push(`TODO in ${shortPath}:${t.line} - ${t.text}`);
      });

      // Show remaining count if any
      const shown = Math.min(fixmes.length, 3) + Math.min(regularTodos.length, 3);
      const remaining = todos.length - shown;
      if (remaining > 0) {
        blockers.push(`... and ${remaining} more TODO/FIXME item${remaining > 1 ? 's' : ''}`);
      }
    }
    if (code?.failingTests.length) {
      code.failingTests.slice(0, 3).forEach(t => {
        blockers.push(`Failing test: ${t.name}`);
      });
      const remaining = code.failingTests.length - 3;
      if (remaining > 0) {
        blockers.push(`... and ${remaining} more failing test${remaining > 1 ? 's' : ''}`);
      }
    }

    return { summary, nextStep, blockers };
  } else {
    const pr = ctx.pr!;
    const totalChanges = pr.files.reduce((sum, f) => sum + (f.additions || 0) + (f.deletions || 0), 0);

    return {
      summary: `PR #${pr.number}: "${pr.title}" by @${pr.author} (${pr.commits.length} commit${pr.commits.length > 1 ? 's' : ''}, ${totalChanges} line${totalChanges > 1 ? 's' : ''} changed)`,
      highRiskFiles: pr.files
        .filter(f => (f.additions || 0) + (f.deletions || 0) > 50)
        .map(f => f.path),
      lowRiskFiles: pr.files
        .filter(f => f.path.includes('test') || f.path.includes('spec') || f.path.endsWith('.md'))
        .map(f => f.path),
      questions: pr.files.some(f => f.path.includes('test'))
        ? []
        : ['Does this change have adequate test coverage?'],
      blockers: [],
    };
  }
}

export async function synthesizeWithCopilot(ctx: AggregatedContext): Promise<SynthesisResult> {
  const prompt = ctx.mode === 'personal'
    ? buildPersonalContextPrompt(ctx)
    : buildPRContextPrompt(ctx);

  const copilotResult = await tryCopilotCLI(prompt);

  if (copilotResult) {
    const result = ctx.mode === 'personal'
      ? parsePersonalResponse(copilotResult)
      : parsePRResponse(copilotResult);
    result.fallbackMode = false;
    return result;
  }

  // Use smart basic analysis as fallback
  const result = generateSmartBasicAnalysis(ctx);
  result.fallbackMode = true;
  return result;
}
