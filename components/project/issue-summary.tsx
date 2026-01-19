import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Issue } from "@/types";
import { AlertTriangle } from "lucide-react";

interface IssueSummaryProps {
  issues: Issue[];
}

export function IssueSummary({ issues }: IssueSummaryProps) {
  const counts = {
    CRITICAL: issues.filter(i => i.severity === 'CRITICAL').length,
    HIGH: issues.filter(i => i.severity === 'HIGH').length,
    MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
    LOW: issues.filter(i => i.severity === 'LOW').length,
    INFO: issues.filter(i => i.severity === 'INFO').length,
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{issues.length}</div>
        <div className="flex items-center gap-3 mt-3 text-xs">
          {counts.CRITICAL > 0 && (
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span>{counts.CRITICAL} Critical</span>
            </div>
          )}
          {counts.HIGH > 0 && (
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              <span>{counts.HIGH} High</span>
            </div>
          )}
          {counts.MEDIUM > 0 && (
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
              <span>{counts.MEDIUM} Medium</span>
            </div>
          )}
          {counts.LOW > 0 && (
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span>{counts.LOW} Low</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
