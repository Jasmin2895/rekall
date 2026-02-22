import { GitContext, CommitInfo, FileChange, StashInfo } from '../types/index.js';
import { execSafe } from '../utils/shell.js';

export function parseCommitLog(log: string): CommitInfo[] {
  if (!log.trim()) return [];

  return log.split('\n').filter(Boolean).map(line => {
    const [hash, message, date] = line.split('|');
    return { hash, message, date };
  });
}

export function parseStatusOutput(status: string): FileChange[] {
  if (!status.trim()) return [];

  return status.split('\n').filter(Boolean).map(line => {
    const statusCode = line.substring(0, 2).trim();
    const path = line.substring(3).trim();

    let fileStatus: FileChange['status'] = 'modified';
    if (statusCode.includes('A') || statusCode === '??') {
      fileStatus = 'added';
    } else if (statusCode.includes('D')) {
      fileStatus = 'deleted';
    } else if (statusCode.includes('R')) {
      fileStatus = 'renamed';
    }

    return { path, status: fileStatus };
  });
}

export function parseStashList(stashOutput: string): StashInfo[] {
  if (!stashOutput.trim()) return [];

  return stashOutput.split('\n').filter(Boolean).map((line, index) => {
    // Parse: stash@{0}: On branch-name: message
    const match = line.match(/stash@\{(\d+)\}:\s*(?:On\s+)?([^:]+):\s*(.+)/);
    if (match) {
      return {
        index: parseInt(match[1], 10),
        branch: match[2].trim(),
        message: match[3].trim(),
      };
    }
    return { index, branch: 'unknown', message: line };
  });
}

export function calculateDaysSince(dateString: string): number {
  if (!dateString) return -1;

  // Try to parse relative dates like "5 days ago"
  const daysMatch = dateString.match(/(\d+)\s*days?\s*ago/);
  if (daysMatch) {
    return parseInt(daysMatch[1], 10);
  }

  const weeksMatch = dateString.match(/(\d+)\s*weeks?\s*ago/);
  if (weeksMatch) {
    return parseInt(weeksMatch[1], 10) * 7;
  }

  const monthsMatch = dateString.match(/(\d+)\s*months?\s*ago/);
  if (monthsMatch) {
    return parseInt(monthsMatch[1], 10) * 30;
  }

  if (dateString.includes('hour') || dateString.includes('minute') || dateString.includes('second')) {
    return 0;
  }

  return -1;
}

export async function getGitContext(): Promise<GitContext> {
  return collectGitContext();
}

export async function collectGitContext(): Promise<GitContext> {
  const [branch, log, status, stash] = await Promise.all([
    execSafe('git branch --show-current', 'unknown'),
    execSafe('git log --oneline -10 --format="%h|%s|%ar"', ''),
    execSafe('git status --porcelain', ''),
    execSafe('git stash list', ''),
  ]);

  const commits = parseCommitLog(log);
  const lastCommit = commits[0] || { hash: '', message: 'No commits', date: '' };

  return {
    branch: branch || 'unknown',
    lastCommit,
    recentCommits: commits,
    uncommittedChanges: parseStatusOutput(status),
    stashes: parseStashList(stash),
    daysSinceLastCommit: calculateDaysSince(lastCommit.date),
  };
}
