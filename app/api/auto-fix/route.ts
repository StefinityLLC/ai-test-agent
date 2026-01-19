import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProject, updateIssue, createTestRun } from "@/lib/db";
import { getRepoFiles, createBranch, commitFile, createPullRequest } from "@/lib/github";
import { generateFix } from "@/lib/claude";
import { mockTestRun } from "@/lib/test-runner";
import { supabase } from "@/lib/db";

export async function POST(req: Request) {
  let issueId: string | undefined;
  let projectId: string | undefined;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const body = await req.json();
    issueId = body.issueId;
    projectId = body.projectId;
    
    if (!issueId || !projectId) {
      return NextResponse.json(
        { error: "Issue ID and Project ID are required" }, 
        { status: 400 }
      );
    }

    // Step 1: Fetch issue and project
    const { data: issue } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single();
      
    if (!issue) {
      return NextResponse.json(
        { error: "Issue not found" }, 
        { status: 404 }
      );
    }
    
    const project = await getProject(projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" }, 
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (project.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to access this project" }, 
        { status: 403 }
      );
    }
    
    console.log(`Starting auto-fix for issue ${issueId}...`);
    
    // Mark issue as in_progress
    await updateIssue(issueId, { status: 'in_progress' });
    
    // Step 2: Get original file content from issue cache
    if (!issue.file_path) {
      return NextResponse.json(
        { error: "Issue does not have an associated file" }, 
        { status: 400 }
      );
    }
    
    // OPTIMIZATION: Use cached original_code instead of fetching from GitHub
    let fileContent = issue.original_code;
    
    if (!fileContent) {
      // Fallback: Fetch from GitHub if cache miss
      console.log(`Cache miss for ${issue.file_path}, fetching from GitHub...`);
      const files = await getRepoFiles(
        project.repo_owner,
        project.repo_name,
        project.branch,
        session.accessToken,
        issue.file_path.split('/').slice(0, -1).join('/') || '', // Parent directory
        1 // Only fetch this one file
      );
      
      const targetFile = files.find(f => f.path === issue.file_path);
      
      if (!targetFile) {
        return NextResponse.json(
          { error: "File not found in repository" }, 
          { status: 404 }
        );
      }
      
      fileContent = targetFile.content;
    }
    
    console.log(`Using file: ${issue.file_path} (${fileContent ? 'cached' : 'fetched'})`);
    
    // Step 3: Generate fix using Claude
    const fixResult = await generateFix(
      fileContent,
      issue.file_path,
      `${issue.title}\n\n${issue.description || ''}`,
      project.language || undefined
    );
    
    console.log(`Fix generated. Changes: ${fixResult.changes.join(', ')}`);
    
    // Step 4: Create a new branch for the fix
    const branchName = `ai-fix-issue-${issueId.substring(0, 8)}-${Date.now()}`;
    const branchResult = await createBranch(
      project.repo_owner,
      project.repo_name,
      branchName,
      project.branch,
      session.accessToken
    );
    
    if (!branchResult.success) {
      throw new Error(`Failed to create branch: ${branchResult.error}`);
    }
    
    console.log(`Branch created: ${branchName}`);
    
    // Step 5: Commit the fix
    const commitMessage = `🤖 AI Auto-fix: ${issue.title}

${fixResult.explanation}

Changes:
${fixResult.changes.map(c => `- ${c}`).join('\n')}

Fixes issue #${issueId.substring(0, 8)}`;
    
    const commitResult = await commitFile(
      project.repo_owner,
      project.repo_name,
      branchName,
      issue.file_path,
      fixResult.fixedCode,
      commitMessage,
      session.accessToken
    );
    
    if (!commitResult.success) {
      throw new Error(`Failed to commit fix: ${commitResult.error}`);
    }
    
    console.log(`Fix committed to ${branchName}`);
    
    // Step 6: Run tests (mock for MVP)
    const testResult = await mockTestRun(true);
    
    // Save test run
    await createTestRun({
      project_id: projectId,
      total_tests: testResult.totalTests,
      passed: testResult.passed,
      failed: testResult.failed,
      duration_ms: testResult.durationMs,
      commit_sha: commitResult.sha,
      results: {
        output: testResult.output,
        success: testResult.success,
      },
    });
    
    console.log(`Tests run: ${testResult.passed}/${testResult.totalTests} passed`);
    
    // Step 7: Create Pull Request
    const prBody = `## 🤖 AI Auto-Fix

**Issue**: ${issue.title}
**Severity**: ${issue.severity}
**File**: \`${issue.file_path}\`${issue.line_number ? ` (Line ${issue.line_number})` : ''}

### Description
${issue.description || 'No description provided.'}

### Fix Explanation
${fixResult.explanation}

### Changes Made
${fixResult.changes.map(c => `- ${c}`).join('\n')}

### Test Results
- **Total Tests**: ${testResult.totalTests}
- **Passed**: ${testResult.passed} ✅
- **Failed**: ${testResult.failed} ${testResult.failed > 0 ? '❌' : ''}
- **Duration**: ${(testResult.durationMs / 1000).toFixed(2)}s

---

*This PR was automatically generated by AI Test Agent*`;
    
    const prResult = await createPullRequest(
      project.repo_owner,
      project.repo_name,
      `🤖 AI Fix: ${issue.title}`,
      branchName,
      project.branch,
      prBody,
      session.accessToken
    );
    
    if (!prResult.success) {
      throw new Error(`Failed to create PR: ${prResult.error}`);
    }
    
    console.log(`PR created: ${prResult.prUrl}`);
    
    // Step 8: Update issue with fix details
    await updateIssue(issueId, {
      status: testResult.success ? 'fixed' : 'in_progress',
      fix_code: fixResult.fixedCode,
    });
    
    // Step 9: Create fix history record
    await supabase
      .from('fix_history')
      .insert({
        issue_id: issueId,
        commit_sha: commitResult.sha,
        pr_url: prResult.prUrl,
        success: testResult.success,
      });
    
    return NextResponse.json({
      success: true,
      branch: branchName,
      commitSha: commitResult.sha,
      prUrl: prResult.prUrl,
      prNumber: prResult.prNumber,
      testsPassed: testResult.success,
      testsRun: {
        total: testResult.totalTests,
        passed: testResult.passed,
        failed: testResult.failed,
      },
      fixExplanation: fixResult.explanation,
      changes: fixResult.changes,
    });
    
  } catch (error: any) {
    console.error('Error during auto-fix:', error);
    
    // CRITICAL: Reset issue status to 'open' on error so user can retry
    if (issueId) {
      try {
        console.log(`Resetting issue ${issueId} status to 'open' due to error`);
        await updateIssue(issueId, { status: 'open' });
      } catch (resetError) {
        console.error('Failed to reset issue status:', resetError);
      }
    }
    
    return NextResponse.json(
      { error: error.message || "Auto-fix failed" }, 
      { status: 500 }
    );
  }
}
