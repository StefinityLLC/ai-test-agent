'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface AIReviewSettings {
  enabled: boolean;
  confidence_threshold: number;
  auto_merge_low: boolean;
  auto_merge_medium: boolean;
  auto_merge_high: boolean;
  auto_merge_critical: boolean;
  notify_on_merge: boolean;
}

export function AIReviewSettingsPanel({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<AIReviewSettings>({
    enabled: true,
    confidence_threshold: 80,
    auto_merge_low: true,
    auto_merge_medium: true,
    auto_merge_high: true,
    auto_merge_critical: false,
    notify_on_merge: true,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [projectId]);

  async function fetchSettings() {
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-review-settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching AI review settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-review-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('AI Review settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🤖 AI Code Review & Auto-Merge</CardTitle>
        <CardDescription>
          Configure automatic code review and merge behavior for AI-generated fixes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable AI Review */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enabled">Enable AI Code Review</Label>
            <p className="text-sm text-muted-foreground">
              Automatically review all AI-generated PRs with Claude AI
            </p>
          </div>
          <input
            type="checkbox"
            id="enabled"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="w-5 h-5"
          />
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-2">
          <Label htmlFor="confidence">
            Confidence Threshold: <strong>{settings.confidence_threshold}%</strong>
          </Label>
          <p className="text-sm text-muted-foreground">
            Minimum confidence score required for auto-merge
          </p>
          <input
            type="range"
            id="confidence"
            min="50"
            max="100"
            step="5"
            value={settings.confidence_threshold}
            onChange={(e) =>
              setSettings({ ...settings, confidence_threshold: parseInt(e.target.value) })
            }
            className="w-full"
            disabled={!settings.enabled}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50% (Risky)</span>
            <span>75% (Balanced)</span>
            <span>100% (Safest)</span>
          </div>
        </div>

        {/* Auto-Merge by Severity */}
        <div className="space-y-3">
          <Label>Auto-Merge by Severity</Label>
          <p className="text-sm text-muted-foreground">
            Choose which severity levels can be auto-merged after AI review
          </p>
          
          <div className="space-y-2">
            {/* LOW */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge className="bg-gray-500">LOW</Badge>
                <span className="text-sm">Cosmetic issues, typos, edge cases</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_merge_low}
                onChange={(e) =>
                  setSettings({ ...settings, auto_merge_low: e.target.checked })
                }
                className="w-5 h-5"
                disabled={!settings.enabled}
              />
            </div>

            {/* MEDIUM */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-500">MEDIUM</Badge>
                <span className="text-sm">Minor features broken, UI glitches</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_merge_medium}
                onChange={(e) =>
                  setSettings({ ...settings, auto_merge_medium: e.target.checked })
                }
                className="w-5 h-5"
                disabled={!settings.enabled}
              />
            </div>

            {/* HIGH */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge className="bg-orange-500">HIGH</Badge>
                <span className="text-sm">Major features broken, auth issues</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_merge_high}
                onChange={(e) =>
                  setSettings({ ...settings, auto_merge_high: e.target.checked })
                }
                className="w-5 h-5"
                disabled={!settings.enabled}
              />
            </div>

            {/* CRITICAL */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge className="bg-red-500">CRITICAL</Badge>
                <span className="text-sm">App crashes, security vulnerabilities</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_merge_critical}
                onChange={(e) =>
                  setSettings({ ...settings, auto_merge_critical: e.target.checked })
                }
                className="w-5 h-5"
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notify">Notify on Auto-Merge</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when PRs are automatically merged
            </p>
          </div>
          <input
            type="checkbox"
            id="notify"
            checked={settings.notify_on_merge}
            onChange={(e) =>
              setSettings({ ...settings, notify_on_merge: e.target.checked })
            }
            className="w-5 h-5"
            disabled={!settings.enabled}
          />
        </div>

        {/* Save Button */}
        <Button onClick={saveSettings} disabled={saving || !settings.enabled} className="w-full">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>

        {/* Warning Note */}
        {settings.auto_merge_critical && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300">
              ⚠️ <strong>Warning:</strong> Auto-merging CRITICAL severity fixes can be risky. We
              recommend manual review for critical issues.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
