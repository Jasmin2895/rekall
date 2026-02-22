import { describe, it, expect } from 'vitest';
import { parseTodos, parseTestOutput } from './code.js';

describe('parseTodos', () => {
  it('should parse empty output', () => {
    expect(parseTodos('')).toEqual([]);
    expect(parseTodos('   ')).toEqual([]);
  });

  it('should parse TODO comments', () => {
    const output = 'src/index.ts:10: // TODO: Implement feature';
    const result = parseTodos(output);
    expect(result).toEqual([
      { file: 'src/index.ts', line: 10, type: 'TODO', text: 'Implement feature' },
    ]);
  });

  it('should parse FIXME comments', () => {
    const output = 'src/utils.ts:25: // FIXME: Fix memory leak';
    const result = parseTodos(output);
    expect(result).toEqual([
      { file: 'src/utils.ts', line: 25, type: 'FIXME', text: 'Fix memory leak' },
    ]);
  });

  it('should parse multiple TODO items', () => {
    const output = `src/index.ts:10: // TODO: First task
src/utils.ts:20: // FIXME: Bug fix needed
src/app.ts:30: // TODO: Add tests`;
    const result = parseTodos(output);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('TODO');
    expect(result[1].type).toBe('FIXME');
    expect(result[2].type).toBe('TODO');
  });

  it('should handle case insensitive TODO/FIXME', () => {
    const output = `src/a.ts:1: // todo: lowercase
src/b.ts:2: // Todo: mixed case`;
    const result = parseTodos(output);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('TODO');
    expect(result[1].type).toBe('TODO');
  });

  it('should ignore malformed lines', () => {
    const output = `not a valid line
src/index.ts:10: // TODO: Valid line
another invalid`;
    const result = parseTodos(output);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Valid line');
  });
});

describe('parseTestOutput', () => {
  it('should parse empty output', () => {
    expect(parseTestOutput('')).toEqual([]);
    expect(parseTestOutput('   ')).toEqual([]);
  });

  it('should parse passing tests with checkmark', () => {
    const output = '  ✓ should work correctly';
    const result = parseTestOutput(output);
    expect(result).toEqual([
      { name: 'should work correctly', status: 'passed' },
    ]);
  });

  it('should parse failing tests with x mark', () => {
    const output = '  ✕ should handle errors';
    const result = parseTestOutput(output);
    expect(result).toEqual([
      { name: 'should handle errors', status: 'failed' },
    ]);
  });

  it('should parse mixed test results', () => {
    const output = `  ✓ test 1 passes
  ✕ test 2 fails
  ✓ test 3 passes`;
    const result = parseTestOutput(output);
    expect(result).toHaveLength(3);
    expect(result[0].status).toBe('passed');
    expect(result[1].status).toBe('failed');
    expect(result[2].status).toBe('passed');
  });

  it('should parse Jest FAIL indicator', () => {
    const output = 'FAIL src/app.test.ts';
    const result = parseTestOutput(output);
    expect(result).toEqual([
      { name: 'src/app.test.ts', status: 'failed' },
    ]);
  });

  it('should handle alternative checkmark symbols', () => {
    const output = '  ✔ alternative checkmark test';
    const result = parseTestOutput(output);
    expect(result).toEqual([
      { name: 'alternative checkmark test', status: 'passed' },
    ]);
  });
});
