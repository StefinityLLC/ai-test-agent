'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIReviewSettingsPanel } from '@/components/project/ai-review-settings-panel';

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push(`/projects/${id}`)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Project
        </Button>
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground">Manage AI Test Agent behavior for this project</p>
      </div>

      <div className="space-y-6">
        <AIReviewSettingsPanel projectId={id} />
      </div>
    </div>
  );
}
