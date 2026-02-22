import { PRContext, CommitInfo, FileChange } from '../types/index.js';
import { exec } from '../utils/shell.js';

interface GHPRResponse {
  number: number;
  title: string;
  body: string;
  author: {
    login: string;
  };
  url: string;
  baseRefName: string;
  headRefName: string;
  commits: {
    oid: string;
    messageHeadline: string;
    committedDate: string;
    authors: { name: string }[];
  }[];
}

interface GHFilesResponse {
  path: string;
  additions: number;
  deletions: number;
}

export async function collectPRContext(prNumber: number, repo?: string): Promise<PRContext> {
  const repoFlag = repo ? `-R ${repo}` : '';

  // Fetch PR data using gh CLI
  const prDataRaw = await exec(
    `gh pr view ${prNumber} ${repoFlag} --json number,title,body,author,url,baseRefName,headRefName,commits`
  );

  const prData: GHPRResponse = JSON.parse(prDataRaw);

  // Fetch file changes
  const filesRaw = await exec(
    `gh pr view ${prNumber} ${repoFlag} --json files --jq '.files[] | {path, additions, deletions}'`
  );

  const files: FileChange[] = filesRaw
    .split('\n')
    .filter(Boolean)
    .map((line): FileChange | null => {
      try {
        const file: GHFilesResponse = JSON.parse(line);
        return {
          path: file.path,
          status: 'modified',
          additions: file.additions,
          deletions: file.deletions,
        };
      } catch {
        return null;
      }
    })
    .filter((f): f is FileChange => f !== null);

  const commits: CommitInfo[] = prData.commits.map(c => ({
    hash: c.oid.substring(0, 7),
    message: c.messageHeadline,
    date: c.committedDate,
    author: c.authors[0]?.name,
  }));

  return {
    number: prData.number,
    title: prData.title,
    body: prData.body || '',
    author: prData.author.login,
    commits,
    files,
    url: prData.url,
    baseBranch: prData.baseRefName,
    headBranch: prData.headRefName,
  };
}

export async function isPRAvailable(prNumber: number, repo?: string): Promise<boolean> {
  try {
    const repoFlag = repo ? `-R ${repo}` : '';
    await exec(`gh pr view ${prNumber} ${repoFlag} --json number`);
    return true;
  } catch {
    return false;
  }
}
