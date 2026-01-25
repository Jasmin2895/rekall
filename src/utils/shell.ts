import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(execCallback);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export async function exec(command: string, cwd?: string): Promise<string> {
  try {
    const { stdout } = await execPromise(command, {
      cwd: cwd || process.cwd(),
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      encoding: 'utf-8',
    });
    // Use trimEnd() to preserve leading whitespace (significant in git status --porcelain)
    return stdout.trimEnd();
  } catch (error: unknown) {
    const err = error as Error & { stdout?: string; stderr?: string };
    // Some commands exit with non-zero but still have useful output
    if (err.stdout) {
      return err.stdout.trimEnd();
    }
    throw error;
  }
}

export async function execSafe(command: string, fallback: string = '', cwd?: string): Promise<string> {
  try {
    return await exec(command, cwd);
  } catch {
    return fallback;
  }
}

export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await exec(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}
