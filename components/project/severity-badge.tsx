import { Badge } from "@/components/ui/badge";
import type { Issue } from "@/types";

interface SeverityBadgeProps {
  severity: Issue['severity'];
}

const severityConfig = {
  CRITICAL: {
    label: 'Critical',
    icon: '🔴',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200'
  },
  HIGH: {
    label: 'High',
    icon: '🟠',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 hover:bg-orange-200'
  },
  MEDIUM: {
    label: 'Medium',
    icon: '🟡',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-200'
  },
  LOW: {
    label: 'Low',
    icon: '🟢',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200'
  },
  INFO: {
    label: 'Info',
    icon: '⚪',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200'
  },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  
  return (
    <Badge variant="secondary" className={config.className}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
}
