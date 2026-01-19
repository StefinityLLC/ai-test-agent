// MILESTONE 2 OPTIMIZATION: Git Local Operations
// Clone and manage local repositories for analysis

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

// Base directory for cloned repos
const REPOS_BASE_DIR = path.join(process.cwd(), '.ai-test-agent', 'repos');

export interface LocalRepoInfo {
  path: string;
  branch: string;
  lastPull: Date;
}

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
}

/**
 * Initialize repos directory
 */
async function ensureReposDir() {
  if (!existsSync(REPOS_BASE_DIR)) {
    await fs.mkdir(REPOS_BASE_DIR, { recursive: true });
  }
}

/**
 * Get local repo path for a project
 */
export function getLocalRepoPath(projectId: string): string {
  return path.join(REPOS_BASE_DIR, `project-${projectId}`);
}

/**
 * Clone repository locally
 */
export async function cloneRepo(
  repoUrl: string,
  projectId: string,
  branch: string = 'main',
  token?: string
): Promise<string> {
  await ensureReposDir();
  
  const repoPath = getLocalRepoPath(projectId);
  
  // Check if already cloned
  if (existsSync(repoPath)) {
    console.log(`Repository already exists at ${repoPath}, pulling latest...`);
    return repoPath;
  }
  
  try {
    // Build authenticated URL if token provided
    let cloneUrl = repoUrl;
    if (token && repoUrl.includes('github.com')) {
      cloneUrl = repoUrl.replace('https://', `https://x-access-token:${token}@`);
    }
    
    console.log(`Cloning ${repoUrl} to ${repoPath}...`);
    
    // Clone with depth 1 for faster cloning
    await execAsync(`git clone --depth 1 --branch ${branch} "${cloneUrl}" "${repoPath}"`, {
      timeout: 120000, // 2 minute timeout
    });
    
    console.log(`Successfully cloned to ${repoPath}`);
    return repoPath;
  } catch (error: any) {
    console.error('Error cloning repository:', error);
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

/**
 * Pull latest changes and return list of changed files
 */
export async function pullLatestChanges(
  repoPath: string,
  branch: string = 'main'
): Promise<ChangedFile[]> {
  if (!existsSync(repoPath)) {
    throw new Error('Repository not found locally');
  }
  
  try {
    // Get current HEAD commit
    const { stdout: beforeCommit } = await execAsync('git rev-parse HEAD', {
      cwd: repoPath,
    });
    
    // Pull latest changes
    await execAsync(`git pull origin ${branch}`, {
      cwd: repoPath,
      timeout: 60000, // 1 minute timeout
    });
    
    // Get new HEAD commit
    const { stdout: afterCommit } = await execAsync('git rev-parse HEAD', {
      cwd: repoPath,
    });
    
    // If no changes, return empty array
    if (beforeCommit.trim() === afterCommit.trim()) {
      console.log('No changes detected');
      return [];
    }
    
    // Get list of changed files
    const { stdout: diffOutput } = await execAsync(
      `git diff --name-status ${beforeCommit.trim()} ${afterCommit.trim()}`,
      { cwd: repoPath }
    );
    
    // Parse diff output
    const changedFiles: ChangedFile[] = [];
    const lines = diffOutput.trim().split('\n').filter(l => l);
    
    for (const line of lines) {
      const [status, filePath] = line.split('\t');
      changedFiles.push({
        path: filePath,
        status: status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
      });
    }
    
    console.log(`Pulled changes: ${changedFiles.length} files affected`);
    return changedFiles;
  } catch (error: any) {
    console.error('Error pulling changes:', error);
    throw new Error(`Failed to pull changes: ${error.message}`);
  }
}

/**
 * Read all code files from local repository
 */
export async function readLocalFiles(
  repoPath: string,
  specificFiles?: string[]
): Promise<Array<{ path: string; content: string; size: number }>> {
  const files: Array<{ path: string; content: string; size: number }> = [];
  
  const CODE_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.py', '.pyw',
    '.java', '.kt', '.kts',
    '.go', '.rs', '.rb', '.php', '.cs',
    '.cpp', '.c', '.h', '.hpp',
    '.swift', '.dart', '.vue', '.svelte',
  ];
  
  const SKIP_DIRS = [
    'node_modules', '.next', 'dist', 'build', '.git',
    '__pycache__', 'venv', '.venv', 'vendor', 'coverage',
    '.cache', 'tmp', 'temp', '.nuxt', '.output'
  ];
  
  async function walkDir(dir: string, baseDir: string = repoPath) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      // Skip if we have specific files and this isn't one of them
      if (specificFiles && !specificFiles.includes(relativePath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Skip ignored directories
        if (SKIP_DIRS.includes(entry.name)) continue;
        
        await walkDir(fullPath, baseDir);
      } else if (entry.isFile()) {
        // Check if it's a code file
        const hasCodeExt = CODE_EXTENSIONS.some(ext => entry.name.endsWith(ext));
        if (!hasCodeExt) continue;
        
        try {
          const stats = await fs.stat(fullPath);
          
          // Skip large files (>500KB)
          if (stats.size > 500000) continue;
          
          const content = await fs.readFile(fullPath, 'utf-8');
          
          files.push({
            path: relativePath,
            content,
            size: stats.size,
          });
        } catch (error) {
          console.error(`Error reading file ${relativePath}:`, error);
        }
      }
    }
  }
  
  await walkDir(repoPath);
  return files;
}

/**
 * Cleanup local repository
 */
export async function cleanupRepo(projectId: string): Promise<void> {
  const repoPath = getLocalRepoPath(projectId);
  
  if (!existsSync(repoPath)) {
    return;
  }
  
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
    console.log(`Cleaned up repository at ${repoPath}`);
  } catch (error: any) {
    console.error('Error cleaning up repository:', error);
    throw new Error(`Failed to cleanup repository: ${error.message}`);
  }
}

/**
 * Check if repository exists locally
 */
export function repoExists(projectId: string): boolean {
  const repoPath = getLocalRepoPath(projectId);
  return existsSync(path.join(repoPath, '.git'));
}

/**
 * Get repository info
 */
export async function getRepoInfo(repoPath: string): Promise<{
  branch: string;
  lastCommit: string;
  lastCommitDate: Date;
}> {
  try {
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
    });
    
    const { stdout: commit } = await execAsync('git rev-parse HEAD', {
      cwd: repoPath,
    });
    
    const { stdout: commitDate } = await execAsync('git log -1 --format=%cI', {
      cwd: repoPath,
    });
    
    return {
      branch: branch.trim(),
      lastCommit: commit.trim(),
      lastCommitDate: new Date(commitDate.trim()),
    };
  } catch (error: any) {
    console.error('Error getting repo info:', error);
    throw new Error(`Failed to get repo info: ${error.message}`);
  }
}
