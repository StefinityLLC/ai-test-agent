"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "./severity-badge";
import type { Issue } from "@/types";
import { FileCode, MapPin, Wrench, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface IssueCardProps {
  issue: Issue;
  projectId: string;
  onFixComplete?: () => void;
}

export function IssueCard({ issue, projectId, onFixComplete }: IssueCardProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  const handleAutoFix = async () => {
    setIsFixing(true);
    try {
      const response = await fetch('/api/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: issue.id,
          projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Auto-fix failed');
      }

      const result = await response.json();
      setPrUrl(result.prUrl);
      toast.success(`Auto-fix complete! PR created: #${result.prNumber}`);
      
      if (onFixComplete) {
        onFixComplete();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{issue.title}</CardTitle>
            {issue.file_path && (
              <CardDescription className="flex items-center gap-2 mt-2">
                <FileCode className="h-3 w-3" />
                <span className="font-mono text-xs">{issue.file_path}</span>
                {issue.line_number && (
                  <>
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">Line {issue.line_number}</span>
                  </>
                )}
              </CardDescription>
            )}
          </div>
          <SeverityBadge severity={issue.severity} />
        </div>
      </CardHeader>
      {issue.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{issue.description}</p>
        </CardContent>
      )}
      <CardFooter className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Status: <span className="capitalize">{issue.status.replace('_', ' ')}</span>
        </div>
        <div className="flex gap-2">
          {prUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(prUrl, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View PR
            </Button>
          )}
          {issue.auto_fix_available && issue.status !== 'fixed' && !prUrl && (
            <Button
              size="sm"
              onClick={handleAutoFix}
              disabled={isFixing || issue.status === 'in_progress'}
            >
              {isFixing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Auto-fix
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
