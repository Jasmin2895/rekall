import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectProject, isGitRepository } from './config.js';
import { existsSync } from 'fs';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('detectProject', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect Node.js project', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === '/test/project/package.json';
    });

    const result = detectProject('/test/project');
    expect(result.type).toBe('node');
    expect(result.name).toBe('project');
    expect(result.rootPath).toBe('/test/project');
  });

  it('should detect Python project with requirements.txt', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === '/test/myapp/requirements.txt';
    });

    const result = detectProject('/test/myapp');
    expect(result.type).toBe('python');
  });

  it('should detect Python project with pyproject.toml', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === '/test/myapp/pyproject.toml';
    });

    const result = detectProject('/test/myapp');
    expect(result.type).toBe('python');
  });

  it('should detect Go project', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === '/test/goapp/go.mod';
    });

    const result = detectProject('/test/goapp');
    expect(result.type).toBe('go');
  });

  it('should detect Rust project', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === '/test/rustapp/Cargo.toml';
    });

    const result = detectProject('/test/rustapp');
    expect(result.type).toBe('rust');
  });

  it('should return unknown for unrecognized projects', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = detectProject('/test/unknown');
    expect(result.type).toBe('unknown');
  });

  it('should prioritize Node.js over other project types', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      // Project has both package.json and requirements.txt
      return path === '/test/hybrid/package.json' || path === '/test/hybrid/requirements.txt';
    });

    const result = detectProject('/test/hybrid');
    expect(result.type).toBe('node');
  });
});

describe('isGitRepository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return true when .git exists', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === '/test/repo/.git';
    });

    expect(isGitRepository('/test/repo')).toBe(true);
  });

  it('should return false when .git does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    expect(isGitRepository('/test/not-a-repo')).toBe(false);
  });
});
