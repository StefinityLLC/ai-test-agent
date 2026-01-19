import { getOctokit } from "./github";

/**
 * Get CI/CD status checks for a PR
 */
export async function getPRCIStatus(
  owner: string,
  repo: string,
  ref: string, // commit SHA
  token?: string
): Promise<Array<{
  conclusion: 'success' | 'failure' | 'pending' | 'cancelled' | 'skipped' | 'neutral';
  name: string;
  details?: string;
}>> {
  const octokit = getOctokit(token);
  
  try {
    // Get check runs for the commit
    const { data } = await octokit.checks.listForRef({
      owner,
      repo,
      ref,
    });
    
    return data.check_runs.map(run => ({
      conclusion: (run.conclusion as any) || 'pending',
      name: run.name,
      details: run.output?.summary || run.output?.title || undefined,
    }));
  } catch (error) {
    console.error('Error fetching CI status:', error);
    return [];
  }
}

/**
 * Get comments on a PR (including bot comments from SonarQube, linters, etc.)
 */
export async function getPRComments(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<Array<{
  author: string;
  body: string;
  isBot: boolean;
}>> {
  const octokit = getOctokit(token);
  
  try {
    const { data } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });
    
    return data.map(comment => ({
      author: comment.user?.login || 'unknown',
      body: comment.body || '',
      isBot: comment.user?.type === 'Bot',
    }));
  } catch (error) {
    console.error('Error fetching PR comments:', error);
    return [];
  }
}

/**
 * Get PR head SHA (needed for CI status checks)
 */
export async function getPRHeadSHA(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<string | null> {
  const octokit = getOctokit(token);
  
  try {
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    
    return data.head.sha;
  } catch (error) {
    console.error('Error fetching PR head SHA:', error);
    return null;
  }
}
