import { ProjectInfo } from '../types/index.js';
import { existsSync } from 'fs';
import { basename } from 'path';

export function detectProject(cwd: string = process.cwd()): ProjectInfo {
  const name = basename(cwd);
  let type: ProjectInfo['type'] = 'unknown';

  if (existsSync(`${cwd}/package.json`)) {
    type = 'node';
  } else if (existsSync(`${cwd}/requirements.txt`) || existsSync(`${cwd}/pyproject.toml`)) {
    type = 'python';
  } else if (existsSync(`${cwd}/go.mod`)) {
    type = 'go';
  } else if (existsSync(`${cwd}/Cargo.toml`)) {
    type = 'rust';
  }

  return {
    name,
    type,
    rootPath: cwd,
  };
}

export function isGitRepository(cwd: string = process.cwd()): boolean {
  return existsSync(`${cwd}/.git`);
}
