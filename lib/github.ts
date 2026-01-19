import { Octokit } from "@octokit/rest";

export function getOctokit(token?: string) {
  return new Octokit({
    auth: token || process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  });
}

export async function verifyRepoAccess(owner: string, repo: string, token?: string): Promise<boolean> {
  const octokit = getOctokit(token);
  try {
    await octokit.repos.get({ owner, repo });
    return true;
  } catch {
    return false;
  }
}

export async function getRepoInfo(owner: string, repo: string, token?: string) {
  const octokit = getOctokit(token);
  const { data } = await octokit.repos.get({ owner, repo });
  return {
    name: data.name,
    owner: data.owner.login,
    defaultBranch: data.default_branch,
    language: data.language,
    private: data.private,
  };
}

export async function listUserRepos(token?: string) {
  const octokit = getOctokit(token);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100,
  });
  return data;
}

// MILESTONE 2: Code Analysis Functions

interface RepoFile {
  path: string;
  content: string;
  type: 'file' | 'dir';
  size: number;
}

const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',  // JavaScript/TypeScript
  '.py', '.pyw',                                   // Python
  '.java', '.kt', '.kts',                         // Java/Kotlin
  '.go',                                          // Go
  '.rs',                                          // Rust
  '.rb',                                          // Ruby
  '.php',                                         // PHP
  '.cs',                                          // C#
  '.cpp', '.c', '.h', '.hpp',                     // C/C++
  '.swift',                                       // Swift
  '.dart',                                        // Dart
  '.vue',                                         // Vue
  '.svelte',                                      // Svelte
];

const SKIP_DIRS = [
  'node_modules', '.next', 'dist', 'build', '.git', 
  '__pycache__', 'venv', '.venv', 'vendor', 'coverage',
  '.cache', 'tmp', 'temp'
];

export async function getRepoFiles(
  owner: string, 
  repo: string, 
  branch: string = 'main',
  token?: string,
  path: string = '',
  maxFiles: number = 20 // Reduced from 100 to 20
): Promise<RepoFile[]> {
  const octokit = getOctokit(token);
  const files: RepoFile[] = [];
  
  try {
    // OPTIMIZATION: Use Git Trees API instead of Contents API
    // This reduces API calls from N (per file) to 1 (entire tree)
    if (path === '') {
      try {
        // Get the tree SHA for the branch
        const { data: refData } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`,
        });
        
        const treeSha = refData.object.sha;
        
        // Get the entire tree recursively (1 API call!)
        const { data: treeData } = await octokit.git.getTree({
          owner,
          repo,
          tree_sha: treeSha,
          recursive: 'true',
        });
        
        // Filter and fetch only code files
        let fileCount = 0;
        for (const item of treeData.tree) {
          if (fileCount >= maxFiles) break;
          
          // Skip directories and non-code files
          if (item.type !== 'blob') continue;
          
          const itemPath = item.path || '';
          
          // Skip ignored directories
          if (SKIP_DIRS.some(dir => itemPath.includes(`${dir}/`))) continue;
          
          // Only include code files
          const hasCodeExt = CODE_EXTENSIONS.some(ext => itemPath.endsWith(ext));
          if (!hasCodeExt) continue;
          
          // Skip large files
          if (item.size && item.size > 500000) continue;
          
          try {
            // Fetch file content (still need individual calls, but only for filtered files)
            const { data: fileData } = await octokit.repos.getContent({
              owner,
              repo,
              path: itemPath,
              ref: branch,
            });
            
            if ('content' in fileData && fileData.content) {
              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
              files.push({
                path: itemPath,
                content,
                type: 'file',
                size: item.size || 0,
              });
              fileCount++;
            }
          } catch (error) {
            console.error(`Error fetching file ${itemPath}:`, error);
            continue;
          }
        }
        
        return files;
      } catch (treeError) {
        console.error('Error using Git Trees API, falling back to Contents API:', treeError);
        // Fall through to original implementation
      }
    }
    
    // FALLBACK: Original implementation for specific paths
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      // Skip if we've hit max files
      if (files.length >= maxFiles) break;
      
      // Skip ignored directories
      if (item.type === 'dir' && SKIP_DIRS.includes(item.name)) {
        continue;
      }
      
      if (item.type === 'file') {
        // Only include code files
        const hasCodeExt = CODE_EXTENSIONS.some(ext => item.name.endsWith(ext));
        if (!hasCodeExt) continue;
        
        // Skip large files (>500KB)
        if (item.size > 500000) continue;
        
        try {
          // Fetch file content
          const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: item.path,
            ref: branch,
          });
          
          if ('content' in fileData && fileData.content) {
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            files.push({
              path: item.path,
              content,
              type: 'file',
              size: item.size,
            });
          }
        } catch (error) {
          console.error(`Error fetching file ${item.path}:`, error);
          continue;
        }
      } else if (item.type === 'dir') {
        // Recursively get files from subdirectories
        const subFiles = await getRepoFiles(owner, repo, branch, token, item.path, maxFiles - files.length);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error(`Error fetching repo contents at path ${path}:`, error);
  }
  
  return files;
}

export function detectLanguage(files: RepoFile[]): string | null {
  const langCount: Record<string, number> = {};
  
  files.forEach(file => {
    const ext = file.path.substring(file.path.lastIndexOf('.'));
    
    // Map extensions to languages
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) langCount['JavaScript'] = (langCount['JavaScript'] || 0) + 1;
    else if (['.ts', '.tsx'].includes(ext)) langCount['TypeScript'] = (langCount['TypeScript'] || 0) + 1;
    else if (['.py', '.pyw'].includes(ext)) langCount['Python'] = (langCount['Python'] || 0) + 1;
    else if (['.java'].includes(ext)) langCount['Java'] = (langCount['Java'] || 0) + 1;
    else if (['.go'].includes(ext)) langCount['Go'] = (langCount['Go'] || 0) + 1;
    else if (['.rs'].includes(ext)) langCount['Rust'] = (langCount['Rust'] || 0) + 1;
    else if (['.rb'].includes(ext)) langCount['Ruby'] = (langCount['Ruby'] || 0) + 1;
    else if (['.php'].includes(ext)) langCount['PHP'] = (langCount['PHP'] || 0) + 1;
    else if (['.cs'].includes(ext)) langCount['C#'] = (langCount['C#'] || 0) + 1;
    else if (['.cpp', '.c'].includes(ext)) langCount['C++'] = (langCount['C++'] || 0) + 1;
  });
  
  // Return most common language
  const sorted = Object.entries(langCount).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : null;
}

export function detectFramework(files: RepoFile[]): string | null {
  const fileNames = files.map(f => f.path.toLowerCase());
  const packageJsonFile = files.find(f => f.path.endsWith('package.json'));
  
  // Check package.json dependencies
  if (packageJsonFile) {
    try {
      const pkg = JSON.parse(packageJsonFile.content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps['next']) return 'Next.js';
      if (deps['react']) return 'React';
      if (deps['vue']) return 'Vue.js';
      if (deps['@angular/core']) return 'Angular';
      if (deps['svelte']) return 'Svelte';
      if (deps['express']) return 'Express.js';
      if (deps['fastify']) return 'Fastify';
      if (deps['nestjs']) return 'NestJS';
    } catch {
      // Invalid JSON, continue
    }
  }
  
  // Check for Python frameworks
  const requirementsTxt = files.find(f => f.path.endsWith('requirements.txt'));
  if (requirementsTxt) {
    const content = requirementsTxt.content.toLowerCase();
    if (content.includes('django')) return 'Django';
    if (content.includes('flask')) return 'Flask';
    if (content.includes('fastapi')) return 'FastAPI';
  }
  
  // Check for specific config files
  if (fileNames.includes('next.config.js') || fileNames.includes('next.config.mjs')) return 'Next.js';
  if (fileNames.includes('nuxt.config.js')) return 'Nuxt.js';
  if (fileNames.includes('vue.config.js')) return 'Vue.js';
  if (fileNames.includes('angular.json')) return 'Angular';
  if (fileNames.includes('svelte.config.js')) return 'Svelte';
  
  return null;
}

// MILESTONE 3: Auto-fix GitHub Operations

export async function createBranch(
  owner: string,
  repo: string,
  newBranch: string,
  fromBranch: string = 'main',
  token?: string
): Promise<{ success: boolean; sha?: string; error?: string }> {
  const octokit = getOctokit(token);
  
  try {
    // Get the SHA of the source branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });
    
    const sha = refData.object.sha;
    
    // Create new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha,
    });
    
    return { success: true, sha };
  } catch (error: any) {
    console.error('Error creating branch:', error);
    return { success: false, error: error.message };
  }
}

export async function commitFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  message: string,
  token?: string
): Promise<{ success: boolean; sha?: string; error?: string }> {
  const octokit = getOctokit(token);
  
  try {
    // Get current file (if exists) to get its SHA
    let currentSha: string | undefined;
    try {
      const { data: currentFile } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch,
      });
      
      if ('sha' in currentFile) {
        currentSha = currentFile.sha;
      }
    } catch {
      // File doesn't exist, that's okay for new files
    }
    
    // Create or update file
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha: currentSha, // Include SHA if updating existing file
    });
    
    return { success: true, sha: data.commit.sha };
  } catch (error: any) {
    console.error('Error committing file:', error);
    return { success: false, error: error.message };
  }
}

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  head: string, // Source branch
  base: string, // Target branch (usually 'main')
  body?: string,
  token?: string
): Promise<{ success: boolean; prUrl?: string; prNumber?: number; error?: string }> {
  const octokit = getOctokit(token);
  
  try {
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body: body || '',
    });
    
    return {
      success: true,
      prUrl: data.html_url,
      prNumber: data.number,
    };
  } catch (error: any) {
    console.error('Error creating pull request:', error);
    return { success: false, error: error.message };
  }
}

export async function getLatestCommitSha(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<string | null> {
  const octokit = getOctokit(token);
  
  try {
    const { data } = await octokit.repos.getBranch({
      owner,
      repo,
      branch,
    });
    
    return data.commit.sha;
  } catch (error) {
    console.error('Error getting latest commit SHA:', error);
    return null;
  }
}

// MILESTONE 3.5: AI Code Review & Auto-Merge Functions

export async function getPRDiff(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<string> {
  const octokit = getOctokit(token);
  
  try {
    // Get PR diff in unified format
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    });
    
    return data as unknown as string; // GitHub returns raw diff as string
  } catch (error: any) {
    console.error('Error fetching PR diff:', error);
    throw new Error(`Failed to fetch PR diff: ${error.message}`);
  }
}

export async function commentOnPR(
  owner: string,
  repo: string,
  prNumber: number,
  comment: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const octokit = getOctokit(token);
  
  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error commenting on PR:', error);
    return { success: false, error: error.message };
  }
}

export async function mergePR(
  owner: string,
  repo: string,
  prNumber: number,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash',
  token?: string
): Promise<{ success: boolean; sha?: string; error?: string }> {
  const octokit = getOctokit(token);
  
  try {
    const { data } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: mergeMethod,
    });
    
    return { success: true, sha: data.sha };
  } catch (error: any) {
    console.error('Error merging PR:', error);
    return { success: false, error: error.message };
  }
}

export async function closePR(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const octokit = getOctokit(token);
  
  try {
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      state: 'closed',
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error closing PR:', error);
    return { success: false, error: error.message };
  }
}

export async function getPRInfo(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<{
  title: string;
  body: string;
  head: { ref: string };
  base: { ref: string };
  state: string;
} | null> {
  const octokit = getOctokit(token);
  
  try {
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    
    return {
      title: data.title,
      body: data.body || '',
      head: { ref: data.head.ref },
      base: { ref: data.base.ref },
      state: data.state,
    };
  } catch (error) {
    console.error('Error fetching PR info:', error);
    return null;
  }
}
