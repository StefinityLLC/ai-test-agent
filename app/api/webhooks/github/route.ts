import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { reviewPRWithAI, formatReviewComment } from '@/lib/ai-reviewer';
import { getPRDiff, commentOnPR, mergePR, closePR, getPRInfo } from '@/lib/github';
import { getProject, getIssue, getAIReviewSettings, createPRReview, updateIssue } from '@/lib/db';

/**
 * GitHub Webhook Handler - Milestone 3.5
 * Handles PR events and triggers AI code review + auto-merge
 */

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const event = req.headers.get('x-github-event');

    // Verify webhook signature (for security)
    if (!verifyGitHubSignature(body, signature)) {
      console.error('Invalid GitHub webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);

    // Handle Pull Request events
    if (event === 'pull_request') {
      const action = payload.action; // 'opened', 'synchronize', 'reopened'
      const pr = payload.pull_request;
      const repo = payload.repository;

      // Only process when PR is opened or updated
      if (!['opened', 'synchronize'].includes(action)) {
        return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
      }

      // Check if this is an AI-generated PR (from our agent)
      if (!pr.head.ref.startsWith('ai-fix-issue-')) {
        console.log(`PR #${pr.number} is not an AI-generated fix. Skipping review.`);
        return NextResponse.json({ message: 'Not an AI PR, skipped' }, { status: 200 });
      }

      console.log(`🤖 AI PR detected: #${pr.number} - ${pr.title}`);
      console.log(`Repository: ${repo.owner.login}/${repo.name}`);

      // Extract issue ID from branch name (format: ai-fix-issue-{issueId}-{timestamp})
      const branchParts = pr.head.ref.split('-');
      const issueId = branchParts[3]; // ai-fix-issue-{ID}-timestamp

      if (!issueId) {
        console.error('Could not extract issue ID from branch name:', pr.head.ref);
        return NextResponse.json({ error: 'Invalid branch name format' }, { status: 400 });
      }

      // Get issue and project from database
      const issue = await getIssue(issueId);
      if (!issue) {
        console.error('Issue not found:', issueId);
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }

      const project = await getProject(issue.project_id);
      if (!project) {
        console.error('Project not found:', issue.project_id);
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Get AI review settings
      let reviewSettings = await getAIReviewSettings(project.id);
      if (!reviewSettings) {
        // Create default settings if not exist
        reviewSettings = {
          id: '',
          project_id: project.id,
          enabled: true,
          confidence_threshold: 80,
          auto_merge_low: true,
          auto_merge_medium: true,
          auto_merge_high: true,
          auto_merge_critical: false,
          notify_on_merge: true,
          created_at: '',
          updated_at: '',
        };
      }

      if (!reviewSettings.enabled) {
        console.log('AI review is disabled for this project. Skipping.');
        return NextResponse.json({ message: 'AI review disabled' }, { status: 200 });
      }

      // Fetch PR diff
      const prDiff = await getPRDiff(repo.owner.login, repo.name, pr.number);

      // Perform AI Code Review
      console.log('🧠 Running AI code review...');
      const reviewResult = await reviewPRWithAI(
        prDiff,
        {
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          filePath: issue.file_path,
        }
      );

      console.log(`AI Review Result: ${reviewResult.recommendation} (Confidence: ${reviewResult.confidence}%)`);

      // Post review comment to PR
      const reviewComment = formatReviewComment(reviewResult);
      await commentOnPR(repo.owner.login, repo.name, pr.number, reviewComment);

      // Decide action based on review and settings
      let actionTaken: 'merged' | 'changes_requested' | 'rejected' | 'pending' = 'pending';
      const shouldAutoMerge = shouldAutoMergePR(reviewResult, issue.severity, reviewSettings);

      if (shouldAutoMerge && reviewResult.recommendation === 'MERGE') {
        // ✅ Auto-merge
        console.log('✅ Auto-merging PR...');
        const mergeResult = await mergePR(repo.owner.login, repo.name, pr.number, 'squash');

        if (mergeResult.success) {
          actionTaken = 'merged';
          await updateIssue(issue.id, { status: 'fixed', fixed_at: new Date().toISOString() });
          console.log(`✅ PR #${pr.number} merged successfully!`);
        } else {
          console.error('Failed to merge PR:', mergeResult.error);
          actionTaken = 'pending';
        }
      } else if (reviewResult.recommendation === 'REJECT') {
        // ❌ Reject and close PR
        console.log('❌ Rejecting and closing PR...');
        await closePR(repo.owner.login, repo.name, pr.number);
        actionTaken = 'rejected';
        await updateIssue(issue.id, { status: 'open' }); // Revert to open
      } else {
        // ⚠️ Request changes or pending manual review
        actionTaken = 'changes_requested';
        console.log('⚠️ Changes requested or manual review needed.');
      }

      // Save PR review to database
      await createPRReview({
        pr_number: pr.number,
        pr_url: pr.html_url,
        project_id: project.id,
        issue_id: issue.id,
        review_result: reviewResult,
        action_taken: actionTaken,
        merged_at: actionTaken === 'merged' ? new Date().toISOString() : undefined,
      });

      return NextResponse.json({
        message: 'AI review completed',
        action: actionTaken,
        confidence: reviewResult.confidence,
        recommendation: reviewResult.recommendation,
      }, { status: 200 });
    }

    // Other events are ignored
    return NextResponse.json({ message: 'Event not handled' }, { status: 200 });

  } catch (error: any) {
    console.error('Error handling GitHub webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Verify GitHub webhook signature for security
 */
function verifyGitHubSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not set. Skipping signature verification.');
    return true; // Allow in development if secret is not set
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(body).digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Determine if PR should be auto-merged based on settings
 */
function shouldAutoMergePR(
  review: { approved: boolean; confidence: number; recommendation: string },
  issueSeverity: string,
  settings: {
    confidence_threshold: number;
    auto_merge_low: boolean;
    auto_merge_medium: boolean;
    auto_merge_high: boolean;
    auto_merge_critical: boolean;
  }
): boolean {
  // Check confidence threshold
  if (review.confidence < settings.confidence_threshold) {
    return false;
  }

  // Check if recommendation is MERGE
  if (review.recommendation !== 'MERGE') {
    return false;
  }

  // Check severity-based auto-merge settings
  switch (issueSeverity) {
    case 'LOW':
      return settings.auto_merge_low;
    case 'MEDIUM':
      return settings.auto_merge_medium;
    case 'HIGH':
      return settings.auto_merge_high;
    case 'CRITICAL':
      return settings.auto_merge_critical;
    default:
      return false;
  }
}
