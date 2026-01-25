// Git Context Types
export interface CommitInfo {
  hash: string;
  message: string;
  date: string;
  author?: string;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
}

export interface StashInfo {
  index: number;
  message: string;
  branch: string;
}

export interface GitContext {
  branch: string;
  lastCommit: CommitInfo;
  recentCommits: CommitInfo[];
  uncommittedChanges: FileChange[];
  stashes: StashInfo[];
  daysSinceLastCommit: number;
}

// Shell Context Types
export interface CommandEntry {
  command: string;
  timestamp?: Date;
}

export interface ShellContext {
  recentCommands: CommandEntry[];
  patterns: string[];
}

// Code Context Types
export interface TodoItem {
  file: string;
  line: number;
  text: string;
  type: 'TODO' | 'FIXME';
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
}

export interface CodeContext {
  todos: TodoItem[];
  failingTests: TestResult[];
}

// PR Context Types
export interface PRContext {
  number: number;
  title: string;
  body: string;
  author: string;
  commits: CommitInfo[];
  files: FileChange[];
  url: string;
  baseBranch: string;
  headBranch: string;
}

// Project Info
export interface ProjectInfo {
  name: string;
  type: 'node' | 'python' | 'go' | 'rust' | 'unknown';
  rootPath: string;
}

// Aggregated Context
export interface AggregatedContext {
  mode: 'personal' | 'pr';
  git: GitContext;
  shell?: ShellContext;
  code?: CodeContext;
  pr?: PRContext;
  projectInfo: ProjectInfo;
}

// Synthesis Result
export interface SynthesisResult {
  summary: string;
  nextStep?: string;
  highRiskFiles?: string[];
  lowRiskFiles?: string[];
  questions?: string[];
  blockers?: string[];
}
