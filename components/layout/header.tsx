"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Github, LogOut } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();
  
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">AI Test Agent</h1>
        </div>
        
        {status === "loading" ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : session ? (
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Logged in as </span>
              <span className="font-medium">{session.user?.name}</span>
            </div>
            <Button 
              onClick={() => signOut()} 
              variant="outline" 
              size="sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        ) : (
          <Button onClick={() => signIn("github")}>
            <Github className="mr-2 h-4 w-4" />
            Login with GitHub
          </Button>
        )}
      </div>
    </header>
  );
}
