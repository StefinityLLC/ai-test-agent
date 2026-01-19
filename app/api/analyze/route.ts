import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProject, updateProject, createIssue, getProjectIssues, updateIssue, supabase } from "@/lib/db";
import { detectLanguage, detectFramework } from "@/lib/github";
import { analyzeCode, calculateHealthScore } from "@/lib/claude";
import { cloneRepo, pullLatestChanges, readLocalFiles, repoExists, getLocalRepoPath } from "@/lib/git-local";

/**
 * Generate unique issue key for tracking
 */
function generateIssueKey(filePath: string, lineNumber: number | undefined, title: string): string {
  return `${filePath}:${lineNumber || 0}:${title.toLowerCase().trim()}`;
}

/**
 * Smart merge issues - compare new issues with existing ones
 */
async function smartMergeIssues(
  projectId: string,
  filePath: string,
  newIssues: Array<{
    severity: string;
    title: string;
    description: string;
    lineNumber?: number;
    suggestedFix?: string;
  }>,
  fileContent: string
): Promise<{ created: number; updated: number; resolved: number }> {
  let created = 0, updated = 0, resolved = 0;
  
  // Get existing issues for this file
  const { data: existingIssues } = await supabase
    .from('issues')
    .select('*')
    .eq('project_id', projectId)
    .eq('file_path', filePath)
    .in('status', ['open', 'in_progress']);
  
  const existingMap = new Map(
    (existingIssues || []).map(issue => [issue.issue_key, issue])
  );
  
  const processedKeys = new Set<string>();
  
  // Process new issues
  for (const newIssue of newIssues) {
    const issueKey = generateIssueKey(filePath, newIssue.lineNumber, newIssue.title);
    processedKeys.add(issueKey);
    
    const existing = existingMap.get(issueKey);
    
    if (existing) {
      // Issue still exists - update description if changed
      if (existing.description !== newIssue.description) {
        await updateIssue(existing.id, {
          description: newIssue.description,
          is_new: false,
        });
        updated++;
      }
    } else {
      // New issue - create it
      await createIssue({
        project_id: projectId,
        severity: newIssue.severity as any,
        title: newIssue.title,
        description: newIssue.description,
        file_path: filePath,
        line_number: newIssue.lineNumber,
        auto_fix_available: !!newIssue.suggestedFix,
        original_code: fileContent,
        issue_key: issueKey,
        is_new: true,
      });
      created++;
    }
  }
  
  // Auto-resolve issues that no longer exist
  for (const [key, issue] of existingMap) {
    if (!processedKeys.has(key)) {
      await updateIssue(issue.id, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: 'external',
      });
      resolved++;
    }
  }
  
  return { created, updated, resolved };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const { projectId } = await req.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" }, 
        { status: 400 }
      );
    }
    
    const project = await getProject(projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" }, 
        { status: 404 }
      );
    }
    
    if (project.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to access this project" }, 
        { status: 403 }
      );
    }
    
    console.log(`Starting analysis for ${project.repo_owner}/${project.repo_name}...`);
    
    // OPTIMIZATION: Use local git clone
    let repoPath: string;
    let changedFiles: string[] | null = null;
    let isFirstAnalysis = false;
    
    if (repoExists(projectId)) {
      // Repo already cloned - pull latest changes
      console.log('Repository exists locally, pulling changes...');
      repoPath = getLocalRepoPath(projectId);
      
      const changes = await pullLatestChanges(repoPath, project.branch);
      
      if (changes.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No changes detected since last analysis',
          filesAnalyzed: 0,
          issuesFound: 0,
        });
      }
      
      changedFiles = changes
        .filter(f => f.status !== 'deleted')
        .map(f => f.path);
        
      console.log(`Detected ${changedFiles.length} changed files`);
    } else {
      // First time - clone the repo
      console.log('Cloning repository for the first time...');
      isFirstAnalysis = true;
      
      repoPath = await cloneRepo(
        project.github_repo_url,
        projectId,
        project.branch,
        session.accessToken
      );
      
      // Save local repo path to DB
      await updateProject(projectId, {
        local_repo_path: repoPath,
      });
    }
    
    // Step 1: Read files (from local disk - 0 API calls!)
    const files = await readLocalFiles(repoPath, changedFiles || undefined);
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No code files found in repository" }, 
        { status: 400 }
      );
    }
    
    console.log(`Found ${files.length} code files to analyze`);
    
    // Step 2: Detect language and framework (only on first analysis)
    let detectedLanguage = project.language;
    let detectedFramework = project.framework;
    
    if (isFirstAnalysis) {
      const allFiles = await readLocalFiles(repoPath);
      detectedLanguage = detectLanguage(allFiles as any);
      detectedFramework = detectFramework(allFiles as any);
      console.log(`Detected: ${detectedLanguage} / ${detectedFramework}`);
    }
    
    // Step 3: Analyze files with Claude + Smart Merge
    let totalCreated = 0, totalUpdated = 0, totalResolved = 0;
    let analyzedCount = 0;
    const maxFilesToAnalyze = isFirstAnalysis ? 15 : files.length; // Analyze all changed files on re-analysis
    
    for (const file of files.slice(0, maxFilesToAnalyze)) {
      try {
        console.log(`Analyzing ${file.path}...`);
        
        const analysis = await analyzeCode(
          file.content,
          file.path,
          detectedLanguage || undefined
        );
        
        // Smart merge issues for this file
        const stats = await smartMergeIssues(
          projectId,
          file.path,
          analysis.issues,
          file.content
        );
        
        totalCreated += stats.created;
        totalUpdated += stats.updated;
        totalResolved += stats.resolved;
        
        analyzedCount++;
      } catch (error: any) {
        console.error(`Error analyzing ${file.path}:`, error);
      }
    }
    
    console.log(`Analysis complete. Created: ${totalCreated}, Updated: ${totalUpdated}, Resolved: ${totalResolved}`);
    
    // Step 4: Calculate health score based on ALL active issues
    const allIssues = await getProjectIssues(projectId);
    const activeIssues = allIssues.filter(i => ['open', 'in_progress'].includes(i.status));
    
    const healthScore = calculateHealthScore(activeIssues.map(i => ({
      severity: i.severity,
      title: i.title,
      description: i.description || '',
      lineNumber: i.line_number,
    })));
    
    // Step 5: Update project
    await updateProject(projectId, {
      language: detectedLanguage || project.language,
      framework: detectedFramework || project.framework,
      health_score: healthScore,
      last_analyzed: new Date().toISOString(),
      last_pulled_at: new Date().toISOString(),
    });
    
    return NextResponse.json({
      success: true,
      filesAnalyzed: analyzedCount,
      totalFiles: files.length,
      issuesCreated: totalCreated,
      issuesUpdated: totalUpdated,
      issuesResolved: totalResolved,
      totalActiveIssues: activeIssues.length,
      healthScore,
      language: detectedLanguage,
      framework: detectedFramework,
      isFirstAnalysis,
    });
    
  } catch (error: any) {
    console.error('Error analyzing project:', error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze project" }, 
      { status: 500 }
    );
  }
}
