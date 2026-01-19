import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Project } from "@/types";
import { GitBranch, Calendar } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const formattedDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{project.repo_name}</span>
          {project.health_score !== undefined && (
            <span className="text-sm font-normal text-muted-foreground">
              Health: {project.health_score}/100
            </span>
          )}
        </CardTitle>
        <CardDescription className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span>{project.repo_owner}/{project.repo_name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              <span>{project.branch}</span>
            </div>
            {project.language && (
              <span className="px-2 py-0.5 bg-secondary rounded-full">
                {project.language}
              </span>
            )}
          </div>
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Added {formattedDate}</span>
        </div>
        <Link href={`/projects/${project.id}`}>
          <Button size="sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
