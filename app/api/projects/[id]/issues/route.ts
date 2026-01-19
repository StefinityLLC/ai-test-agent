import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProject, getProjectIssues } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Verify project ownership
    const { id } = await params;
    const project = await getProject(id);
    
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
    
    // Fetch issues
    const issues = await getProjectIssues(id);
    
    return NextResponse.json(issues);
    
  } catch (error: any) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}
