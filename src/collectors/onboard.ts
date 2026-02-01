import { OnboardContext, HotArea, ProjectInfo } from '../types/index.js';
import { execSafe } from '../utils/shell.js';
import { existsSync, readFileSync } from 'fs';
import { basename } from 'path';

interface PackageJson {
  name?: string;
  bin?: Record<string, string> | string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface TsConfig {
  compilerOptions?: {
    target?: string;
  };
}

/**
 * Extract key dependencies from package.json (top 5)
 */
export function extractKeyDependencies(cwd: string = process.cwd()): string[] {
  const pkgPath = `${cwd}/package.json`;
  if (!existsSync(pkgPath)) return [];

  try {
    const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const deps = Object.keys(pkg.dependencies || {});
    // Prioritize well-known dependencies
    const priority = ['react', 'vue', 'angular', 'express', 'fastify', 'next', 'commander', 'chalk', 'typescript'];
    const sorted = deps.sort((a, b) => {
      const aIdx = priority.indexOf(a);
      const bIdx = priority.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
    return sorted.slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Get hot areas (most active directories) from git history
 */
export async function getHotAreas(cwd: string = process.cwd()): Promise<HotArea[]> {
  const output = await execSafe(
    'git log --since="7 days ago" --name-only --pretty=format:"" 2>/dev/null | grep -v \'^$\' | sed \'s|/[^/]*$||\' | sort | uniq -c | sort -rn | head -5',
    '',
    cwd
  );

  if (!output.trim()) return [];

  return output
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (match) {
        return {
          directory: match[2],
          commitCount: parseInt(match[1], 10),
          period: '7 days',
        };
      }
      return null;
    })
    .filter((h): h is HotArea => h !== null);
}

/**
 * Detect the run command from package.json scripts
 */
export function detectRunCommand(cwd: string = process.cwd()): string {
  const pkgPath = `${cwd}/package.json`;
  if (!existsSync(pkgPath)) return '';

  try {
    const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const scripts = pkg.scripts || {};

    if (scripts.dev) return 'npm run dev';
    if (scripts.start) return 'npm start';
    if (scripts.serve) return 'npm run serve';
    return '';
  } catch {
    return '';
  }
}

/**
 * Generate architecture string from project configuration
 */
export function generateArchitectureString(cwd: string = process.cwd()): string {
  const pkgPath = `${cwd}/package.json`;
  const tsconfigPath = `${cwd}/tsconfig.json`;

  let language = 'JavaScript';
  let appType = 'App';
  let target = '';

  // Check for TypeScript
  if (existsSync(tsconfigPath)) {
    language = 'TypeScript';
    try {
      const tsconfig: TsConfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
      target = tsconfig.compilerOptions?.target || '';
    } catch {
      // Ignore parsing errors
    }
  } else if (existsSync(pkgPath)) {
    try {
      const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.devDependencies?.typescript) {
        language = 'TypeScript';
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Check for CLI vs App
  if (existsSync(pkgPath)) {
    try {
      const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.bin) {
        appType = 'CLI';
      }
    } catch {
      // Ignore parsing errors
    }
  }

  const parts = [language, appType];
  if (target) {
    parts.push(`(${target})`);
  }

  return parts.join(' ');
}

/**
 * Count TODOs in src/, excluding tests
 */
export async function countCoreTodos(cwd: string = process.cwd()): Promise<{ count: number; location: string }> {
  const srcPath = `${cwd}/src`;
  if (!existsSync(srcPath)) {
    return { count: 0, location: '' };
  }

  const output = await execSafe(
    'grep -rn -E "(//|/\\*|#|<!--|\\*)\\s*(TODO|FIXME)" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --exclude="*.test.*" --exclude="*.spec.*" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=__tests__ src/ 2>/dev/null | wc -l',
    '0',
    cwd
  );

  const count = parseInt(output.trim(), 10) || 0;
  return {
    count,
    location: count > 0 ? 'core logic' : '',
  };
}

/**
 * Detect project type
 */
export function detectProjectType(cwd: string = process.cwd()): ProjectInfo['type'] {
  if (existsSync(`${cwd}/package.json`)) return 'node';
  if (existsSync(`${cwd}/requirements.txt`) || existsSync(`${cwd}/pyproject.toml`)) return 'python';
  if (existsSync(`${cwd}/go.mod`)) return 'go';
  if (existsSync(`${cwd}/Cargo.toml`)) return 'rust';
  return 'unknown';
}

/**
 * Main collector that combines all onboard context
 */
export async function collectOnboardContext(cwd: string = process.cwd()): Promise<OnboardContext> {
  const projectName = basename(cwd);
  const [hotAreas, todoInfo] = await Promise.all([
    getHotAreas(cwd),
    countCoreTodos(cwd),
  ]);

  return {
    projectName,
    architecture: generateArchitectureString(cwd),
    keyDependencies: extractKeyDependencies(cwd),
    hotAreas,
    todoCount: todoInfo.count,
    todoLocation: todoInfo.location,
    runCommand: detectRunCommand(cwd),
    projectType: detectProjectType(cwd),
  };
}
