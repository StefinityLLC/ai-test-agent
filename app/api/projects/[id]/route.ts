import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProject } from "@/lib/db";

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

    const { id } = await params;
    const project = await getProject(id);
    
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
    
    return NextResponse.json(project);
    
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}
