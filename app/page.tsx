"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { ProjectCard } from "@/components/dashboard/project-card";
import { ConnectRepoDialog } from "@/components/dashboard/connect-repo-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import type { Project } from "@/types";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  async function fetchProjects() {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/projects?userId=${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    if (session?.user?.id) {
      fetchProjects();
    } else {
      setLoading(false);
    }
  }, [session?.user?.id]);
  
  // Loading state
  if (status === "loading") {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }
  
  // Not logged in
  if (!session) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-16 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome to AI Test Agent
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Automatically analyze your GitHub repositories, detect issues, and fix them with AI-powered assistance
            </p>
          </div>
          <div className="pt-4">
            <p className="text-muted-foreground">
              Login with GitHub to get started
            </p>
          </div>
        </div>
      </>
    );
  }
  
  // Logged in - show dashboard
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Projects</h2>
            <p className="text-muted-foreground mt-1">
              Manage and monitor your GitHub repositories
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Connect Repository
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-muted-foreground space-y-2">
              <p className="text-lg font-medium">No projects yet</p>
              <p>Connect a GitHub repository to start analyzing your code</p>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Connect Your First Repository
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
      
      <ConnectRepoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchProjects}
      />
    </>
  );
}
