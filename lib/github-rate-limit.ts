// GitHub API Rate Limit Helper
import { getOctokit } from './github';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  percentUsed: number;
}

/**
 * Check GitHub API rate limit status
 */
export async function checkRateLimit(token?: string): Promise<RateLimitInfo> {
  const octokit = getOctokit(token);
  try {
    const { data } = await octokit.rateLimit.get();
    const reset = new Date(data.rate.reset * 1000);
    const percentUsed = ((data.rate.limit - data.rate.remaining) / data.rate.limit) * 100;
    
    console.log(`GitHub API Rate Limit: ${data.rate.remaining}/${data.rate.limit} (${percentUsed.toFixed(1)}% used)`);
    console.log(`Resets at: ${reset.toISOString()}`);
    
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset,
      percentUsed,
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return {
      limit: 5000,
      remaining: 0,
      reset: new Date(),
      percentUsed: 100,
    };
  }
}

/**
 * Format time until rate limit reset
 */
export function formatTimeUntilReset(resetDate: Date): string {
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  const diffMins = Math.ceil(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins} minutes`;
  }
  
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  
  return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${remainingMins} minutes`;
}
