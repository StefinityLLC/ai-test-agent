import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAIReviewSettings, createAIReviewSettings, updateAIReviewSettings, getProject } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify project ownership
    if (project.user_id !== (session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let settings = await getAIReviewSettings(projectId);

    // If settings don't exist, create default settings
    if (!settings) {
      settings = await createAIReviewSettings({
        project_id: projectId,
        enabled: true,
        confidence_threshold: 80,
        auto_merge_low: true,
        auto_merge_medium: true,
        auto_merge_high: true,
        auto_merge_critical: false,
        notify_on_merge: true,
      });
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching AI review settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify project ownership
    if (project.user_id !== (session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update settings
    const updatedSettings = await updateAIReviewSettings(projectId, {
      enabled: body.enabled,
      confidence_threshold: body.confidence_threshold,
      auto_merge_low: body.auto_merge_low,
      auto_merge_medium: body.auto_merge_medium,
      auto_merge_high: body.auto_merge_high,
      auto_merge_critical: body.auto_merge_critical,
      notify_on_merge: body.notify_on_merge,
    });

    return NextResponse.json(updatedSettings, { status: 200 });
  } catch (error: any) {
    console.error('Error updating AI review settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
