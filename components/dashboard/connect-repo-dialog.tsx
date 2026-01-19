"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ConnectRepoDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectRepoDialog({ open, onClose, onSuccess }: ConnectRepoDialogProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  
  async function handleConnect() {
    if (!repoUrl.trim()) {
      toast.error("Please enter a repository URL");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect repository');
      }
      
      toast.success("Repository connected successfully!");
      setRepoUrl("");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to connect repository");
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect GitHub Repository</DialogTitle>
          <DialogDescription>
            Enter the URL of the GitHub repository you want to analyze and monitor
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">Repository URL</Label>
            <Input
              id="repo-url"
              placeholder="https://github.com/username/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleConnect();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConnect} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Repository"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
