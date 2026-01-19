import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createProject } from "@/lib/db";
import { verifyRepoAccess, getRepoInfo } from "@/lib/github";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" }, 
        { status: 401 }
      );
    }

    const body = await req.json();
    const { repoUrl } = body;
    
    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" }, 
        { status: 400 }
      );
    }
    
    // Parse GitHub URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub URL format. Expected: https://github.com/owner/repo" }, 
        { status: 400 }
      );
    }
    
    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, ''); // Remove .git suffix if present
    
    // Verify access to repository
    const userToken = (session.user as any).githubToken;
    const hasAccess = await verifyRepoAccess(owner, repo, userToken);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Cannot access repository. Make sure it exists and you have permission." }, 
        { status: 403 }
      );
    }
    
    // Get repository info
    const repoInfo = await getRepoInfo(owner, repo, userToken);
    
    // Save to database
    const project = await createProject(session.user.id, {
      repoUrl,
      repoName: repoInfo.name,
      repoOwner: repoInfo.owner,
      branch: repoInfo.defaultBranch,
      language: repoInfo.language || undefined,
    });
    
    return NextResponse.json({ 
      project,
      message: "Repository connected successfully" 
    });
    
  } catch (error: any) {
    console.error('Error connecting repository:', error);
    return NextResponse.json(
      { error: error.message || "Failed to connect repository" }, 
      { status: 500 }
    );
  }
}
