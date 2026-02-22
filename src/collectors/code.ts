import { CodeContext, TodoItem, TestResult } from '../types/index.js';
import { execSafe } from '../utils/shell.js';

export function parseTodos(output: string): TodoItem[] {
  if (!output.trim()) return [];

  return output.split('\n').filter(Boolean).map(line => {
    // Parse comment-style TODOs: file:line: // TODO: message or file:line: # TODO: message
    // Must have a comment marker before TODO/FIXME to avoid false positives
    const match = line.match(/^(.+?):(\d+):\s*(?:\/\/|\/\*|#|<!--|\*)\s*(TODO|FIXME)[:\s]+(.+)$/i);
    if (match) {
      const text = match[4].trim()
        .replace(/\*\/\s*$/, '')  // Remove trailing */
        .replace(/-->\s*$/, '');   // Remove trailing -->

      // Skip if the "text" looks like code (contains quotes, brackets, etc.)
      if (text.includes("'") && text.includes("|") || text.startsWith('(')) {
        return null;
      }

      return {
        file: match[1],
        line: parseInt(match[2], 10),
        type: match[3].toUpperCase() as 'TODO' | 'FIXME',
        text,
      };
    }
    return null;
  }).filter((t): t is TodoItem => t !== null);
}

export function parseTestOutput(output: string): TestResult[] {
  if (!output.trim()) return [];

  const results: TestResult[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Jest/Vitest style: ✓ test name or ✕ test name
    const passMatch = line.match(/[✓✔]\s+(.+)/);
    if (passMatch) {
      results.push({ name: passMatch[1].trim(), status: 'passed' });
      continue;
    }

    const failMatch = line.match(/[✕✗×]\s+(.+)/);
    if (failMatch) {
      results.push({ name: failMatch[1].trim(), status: 'failed' });
      continue;
    }

    // Look for FAIL or PASS indicators
    const jestFailMatch = line.match(/FAIL\s+(.+)/);
    if (jestFailMatch) {
      results.push({ name: jestFailMatch[1].trim(), status: 'failed' });
    }
  }

  return results;
}

export async function collectCodeContext(): Promise<CodeContext> {
  // Find TODOs and FIXMEs in comments (exclude dependencies and test files)
  const todoOutput = await execSafe(
    'grep -rn -E "(//|/\\*|#|<!--|\\*)\\s*(TODO|FIXME)" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" --exclude="*.test.*" --exclude="*.spec.*" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=vendor --exclude-dir=.next --exclude-dir=__tests__ . 2>/dev/null | head -20',
    ''
  );

  // Try to detect test failures (quick check, not full test run)
  // We look for recent test output or cached results
  const testOutput = await execSafe(
    'cat .test-results.json 2>/dev/null || cat coverage/test-results.json 2>/dev/null || echo ""',
    ''
  );

  return {
    todos: parseTodos(todoOutput),
    failingTests: parseTestOutput(testOutput),
  };
}
