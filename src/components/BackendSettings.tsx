import { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  getBackendConfig,
  setBackendConfig,
  testBackendConnection,
  BackendConfig,
} from '@/services/backendConfig';

export function BackendSettings() {
  const [config, setConfig] = useState<BackendConfig>(getBackendConfig);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setConfig(getBackendConfig());
      setTestResult(null);
    }
  }, [open]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testBackendConnection(config.url);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSave = () => {
    setBackendConfig(config);
    setOpen(false);
  };

  const handleModeToggle = (checked: boolean) => {
    const newMode = checked ? 'live' : 'mock';
    setConfig(prev => ({ ...prev, mode: newMode }));
    setBackendConfig({ mode: newMode });
  };

  const currentConfig = getBackendConfig();
  const isLive = currentConfig.mode === 'live';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 text-muted-foreground hover:text-foreground",
            "border border-transparent hover:border-border/50"
          )}
        >
          <div className="relative">
            <Settings className="h-4 w-4" />
            <div className={cn(
              "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background",
              isLive ? "bg-status-running" : "bg-muted-foreground"
            )} />
          </div>
          <span className="hidden sm:inline text-xs uppercase tracking-wider">
            {isLive ? 'Live' : 'Mock'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Backend Settings
          </DialogTitle>
          <DialogDescription>
            Configure the connection to your BratesHUB backend server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div className="flex items-center gap-3">
              {config.mode === 'live' ? (
                <Wifi className="h-5 w-5 text-status-running" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm font-medium">
                  {config.mode === 'live' ? 'Live Mode' : 'Mock Mode'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {config.mode === 'live' 
                    ? 'Connected to real backend server' 
                    : 'Using simulated data'}
                </p>
              </div>
            </div>
            <Switch
              checked={config.mode === 'live'}
              onCheckedChange={handleModeToggle}
            />
          </div>

          {/* Backend URL */}
          <div className="space-y-2">
            <Label htmlFor="backend-url">Backend URL</Label>
            <div className="flex gap-2">
              <Input
                id="backend-url"
                value={config.url}
                onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="http://192.168.1.100:3001"
                className="font-mono text-sm"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTest}
                disabled={isTesting || !config.url}
                className="shrink-0"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The URL of your BratesHUB backend server (e.g., http://server-ip:3001)
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg border p-3 text-sm",
              testResult.success 
                ? "border-status-running/30 bg-status-running/10 text-status-running" 
                : "border-status-error/30 bg-status-error/10 text-status-error"
            )}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
