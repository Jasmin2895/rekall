import { describe, it, expect } from 'vitest';
import {
  parseCommitLog,
  parseStatusOutput,
  parseStashList,
  calculateDaysSince,
} from './git.js';

describe('parseCommitLog', () => {
  it('should parse empty log', () => {
    expect(parseCommitLog('')).toEqual([]);
    expect(parseCommitLog('   ')).toEqual([]);
  });

  it('should parse single commit', () => {
    const log = 'abc1234|Fix bug in login|2 days ago';
    const result = parseCommitLog(log);
    expect(result).toEqual([
      { hash: 'abc1234', message: 'Fix bug in login', date: '2 days ago' },
    ]);
  });

  it('should parse multiple commits', () => {
    const log = `abc1234|Fix bug|2 days ago
def5678|Add feature|3 days ago
ghi9012|Initial commit|1 week ago`;
    const result = parseCommitLog(log);
    expect(result).toHaveLength(3);
    expect(result[0].hash).toBe('abc1234');
    expect(result[1].hash).toBe('def5678');
    expect(result[2].hash).toBe('ghi9012');
  });

  it('should filter empty lines', () => {
    const log = `abc1234|Fix bug|2 days ago

def5678|Add feature|3 days ago`;
    const result = parseCommitLog(log);
    expect(result).toHaveLength(2);
  });
});

describe('parseStatusOutput', () => {
  it('should parse empty status', () => {
    expect(parseStatusOutput('')).toEqual([]);
    expect(parseStatusOutput('   ')).toEqual([]);
  });

  it('should parse added files', () => {
    const status = 'A  src/new-file.ts';
    const result = parseStatusOutput(status);
    expect(result).toEqual([{ path: 'src/new-file.ts', status: 'added' }]);
  });

  it('should parse untracked files as added', () => {
    const status = '?? src/untracked.ts';
    const result = parseStatusOutput(status);
    expect(result).toEqual([{ path: 'src/untracked.ts', status: 'added' }]);
  });

  it('should parse modified files', () => {
    const status = ' M src/modified.ts';
    const result = parseStatusOutput(status);
    expect(result).toEqual([{ path: 'src/modified.ts', status: 'modified' }]);
  });

  it('should parse deleted files', () => {
    const status = ' D src/deleted.ts';
    const result = parseStatusOutput(status);
    expect(result).toEqual([{ path: 'src/deleted.ts', status: 'deleted' }]);
  });

  it('should parse renamed files', () => {
    const status = 'R  src/old.ts -> src/new.ts';
    const result = parseStatusOutput(status);
    expect(result[0].status).toBe('renamed');
  });

  it('should parse multiple files', () => {
    const status = ` M src/file1.ts
A  src/file2.ts
?? src/file3.ts
 D src/file4.ts`;
    const result = parseStatusOutput(status);
    expect(result).toHaveLength(4);
    expect(result[0].status).toBe('modified');
    expect(result[1].status).toBe('added');
    expect(result[2].status).toBe('added');
    expect(result[3].status).toBe('deleted');
  });
});

describe('parseStashList', () => {
  it('should parse empty stash list', () => {
    expect(parseStashList('')).toEqual([]);
    expect(parseStashList('   ')).toEqual([]);
  });

  it('should parse single stash', () => {
    const stash = 'stash@{0}: On main: WIP on feature';
    const result = parseStashList(stash);
    expect(result).toEqual([
      { index: 0, branch: 'main', message: 'WIP on feature' },
    ]);
  });

  it('should parse multiple stashes', () => {
    const stash = `stash@{0}: On main: First stash
stash@{1}: On feature: Second stash
stash@{2}: On develop: Third stash`;
    const result = parseStashList(stash);
    expect(result).toHaveLength(3);
    expect(result[0].index).toBe(0);
    expect(result[1].index).toBe(1);
    expect(result[2].index).toBe(2);
  });

  it('should handle malformed stash entries', () => {
    const stash = 'some malformed entry';
    const result = parseStashList(stash);
    expect(result).toHaveLength(1);
    expect(result[0].branch).toBe('unknown');
    expect(result[0].message).toBe('some malformed entry');
  });
});

describe('calculateDaysSince', () => {
  it('should return -1 for empty string', () => {
    expect(calculateDaysSince('')).toBe(-1);
  });

  it('should parse days ago', () => {
    expect(calculateDaysSince('2 days ago')).toBe(2);
    expect(calculateDaysSince('1 day ago')).toBe(1);
    expect(calculateDaysSince('15 days ago')).toBe(15);
  });

  it('should parse weeks ago', () => {
    expect(calculateDaysSince('1 week ago')).toBe(7);
    expect(calculateDaysSince('2 weeks ago')).toBe(14);
    expect(calculateDaysSince('3 weeks ago')).toBe(21);
  });

  it('should parse months ago', () => {
    expect(calculateDaysSince('1 month ago')).toBe(30);
    expect(calculateDaysSince('2 months ago')).toBe(60);
  });

  it('should return 0 for hours/minutes/seconds', () => {
    expect(calculateDaysSince('5 hours ago')).toBe(0);
    expect(calculateDaysSince('30 minutes ago')).toBe(0);
    expect(calculateDaysSince('45 seconds ago')).toBe(0);
  });

  it('should return -1 for unknown formats', () => {
    expect(calculateDaysSince('unknown date')).toBe(-1);
  });
});
