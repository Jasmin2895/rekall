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

export async function synthesizeWithCopilot(ctx: AggregatedContext): Promise<SynthesisResult> {
  const prompt = ctx.mode === 'personal'
    ? buildPersonalContextPrompt(ctx)
    : buildPRContextPrompt(ctx);

  // Escape the prompt for shell
  const escapedPrompt = prompt
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');

  try {
    // Use gh copilot explain for analysis
    const result = await exec(`gh copilot explain "${escapedPrompt}"`);

    return ctx.mode === 'personal'
      ? parsePersonalResponse(result)
      : parsePRResponse(result);
  } catch (error) {
    // If Copilot CLI fails, return a basic analysis based on the raw data
    // Note: We set a flag that the renderer can check, rather than printing here
    // to avoid corrupting the loading spinner output

    if (ctx.mode === 'personal') {
      return {
        summary: `Working on branch "${ctx.git.branch}" with ${ctx.git.uncommittedChanges.length} uncommitted changes.`,
        nextStep: ctx.git.uncommittedChanges.length > 0
          ? `Review and commit changes to: ${ctx.git.uncommittedChanges[0]?.path}`
          : 'Continue development',
        blockers: ctx.code?.todos.length
          ? [`${ctx.code.todos.length} TODO items to address`]
          : [],
        fallbackMode: true,
      };
    } else {
      const pr = ctx.pr!;
      return {
        summary: `PR #${pr.number} by @${pr.author}: ${pr.title}`,
        highRiskFiles: pr.files
          .filter(f => (f.additions || 0) + (f.deletions || 0) > 50)
          .map(f => f.path),
        lowRiskFiles: pr.files
          .filter(f => f.path.includes('test') || f.path.includes('spec'))
          .map(f => f.path),
        questions: ['Does this change have adequate test coverage?'],
        blockers: [],
        fallbackMode: true,
      };
    }
  }
}
