"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { HealthScore } from "@/components/project/health-score";
import { IssueSummary } from "@/components/project/issue-summary";
import { IssueCard } from "@/components/project/issue-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Project, Issue } from "@/types";
import { toast } from "sonner";
import { Loader2, PlayCircle, RefreshCw, ArrowLeft, Settings } from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (!projectRes.ok) throw new Error('Failed to fetch project');
      const projectData = await projectRes.json();
      setProject(projectData);
      
      // Fetch issues
      const issuesRes = await fetch(`/api/projects/${projectId}/issues`);
      if (!issuesRes.ok) throw new Error('Failed to fetch issues');
      const issuesData = await issuesRes.json();
      setIssues(issuesData);
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!session?.accessToken) {
      toast.error("GitHub access token not found. Please sign in again.");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      
      const result = await response.json();
      toast.success(`Analysis complete! Found ${result.issuesFound} issues.`);
      
      // Refresh data
      await fetchProjectData();
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Project not found</h2>
            <Button onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">{project.repo_name}</h1>
            <p className="text-muted-foreground mt-1">
              {project.repo_owner} / {project.branch}
              {project.language && ` • ${project.language}`}
              {project.framework && project.framework !== 'None' && ` • ${project.framework}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/settings`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchProjectData()}
              disabled={isAnalyzing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <HealthScore score={project.health_score || 0} />
          <IssueSummary issues={issues} />
        </div>

        {/* Last Analyzed Info */}
        {project.last_analyzed && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Last analyzed: {new Date(project.last_analyzed).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Issues List */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Issues</h2>
          {issues.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No issues found yet. Run an analysis to get started.
                </p>
                <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <IssueCard 
                  key={issue.id} 
                  issue={issue} 
                  projectId={projectId}
                  onFixComplete={() => fetchProjectData()}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
