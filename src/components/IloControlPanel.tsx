import { useState, useEffect } from 'react';
import {
  Power,
  PowerOff,
  RotateCcw,
  Zap,
  Thermometer,
  Fan,
  Activity,
  Server,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { IloStatus, IloCredentials } from '@/types/ilo';
import { IloCredentialsForm } from '@/components/IloCredentialsForm';
import { iloApi } from '@/services/iloApi';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function IloControlPanel() {
  const [credentials, setCredentials] = useState<IloCredentials | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [status, setStatus] = useState<IloStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    action: 'powerOff' | 'forcePowerOff' | 'reset' | 'powerCycle';
    title: string;
    description: string;
  } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Load credentials on mount
  useEffect(() => {
    const stored = iloApi.getCredentials();
    setCredentials(stored);
    if (!stored) {
      setShowConfig(true);
      setIsLoading(false);
    }
  }, []);

  const fetchStatus = async () => {
    if (!credentials) return;
    const response = await iloApi.getStatus();
    if (response.success && response.data) {
      setStatus(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (credentials) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [credentials]);

  const handleSaveCredentials = (newCredentials: IloCredentials) => {
    iloApi.saveCredentials(newCredentials);
    setCredentials(newCredentials);
    setShowConfig(false);
    toast({
      title: 'Credentials saved',
      description: 'iLO connection credentials have been saved.',
    });
  };

  const handleAction = async (action: 'powerOn' | 'powerOff' | 'forcePowerOff' | 'reset' | 'powerCycle') => {
    // Confirm destructive actions
    if (action !== 'powerOn') {
      const configs = {
        powerOff: { title: 'Graceful Shutdown', description: 'This will gracefully shut down the server. All services will be stopped.' },
        forcePowerOff: { title: 'Force Power Off', description: 'This will immediately cut power to the server. Data loss may occur!' },
        reset: { title: 'Reset Server', description: 'This will perform a warm reset of the server.' },
        powerCycle: { title: 'Power Cycle', description: 'This will power off and then power on the server (cold boot).' },
      };
      setConfirmDialog({ action, ...configs[action] });
      return;
    }

    executeAction(action);
  };

  const executeAction = async (action: 'powerOn' | 'powerOff' | 'forcePowerOff' | 'reset' | 'powerCycle') => {
    setActionLoading(action);
    setConfirmDialog(null);

    try {
      let response;
      switch (action) {
        case 'powerOn':
          response = await iloApi.powerOn();
          break;
        case 'powerOff':
          response = await iloApi.powerOff();
          break;
        case 'forcePowerOff':
          response = await iloApi.forcePowerOff();
          break;
        case 'reset':
          response = await iloApi.reset();
          break;
        case 'powerCycle':
          response = await iloApi.powerCycle();
          break;
      }

      if (response.success) {
        toast({
          title: 'iLO Command Sent',
          description: `Server ${action.replace(/([A-Z])/g, ' $1').toLowerCase()} command executed successfully.`,
        });
        await fetchStatus();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast({
        title: 'iLO Error',
        description: `Failed to execute command: ${error}`,
        variant: 'destructive',
      });
    }

    setActionLoading(null);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'ok': return 'text-status-running';
      case 'warning': return 'text-status-error';
      case 'critical': return 'text-status-stopped';
      default: return 'text-muted-foreground';
    }
  };

  const getPowerStateColor = (state: string) => {
    switch (state) {
      case 'on': return 'text-status-running';
      case 'off': return 'text-status-stopped';
      default: return 'text-muted-foreground';
    }
  };

  // Show config form if no credentials
  if (!credentials || showConfig) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-medium uppercase tracking-wider">iLO Control</h2>
          </div>
          {credentials && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          )}
        </div>
        <IloCredentialsForm
          credentials={credentials}
          onSave={handleSaveCredentials}
          onCancel={credentials ? () => setShowConfig(false) : undefined}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/60 bg-gradient-to-b from-card to-background p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-secondary" />
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-lg border border-status-error/30 bg-status-error/5 p-4">
        <div className="flex items-center gap-3 text-status-error">
          <AlertTriangle className="h-5 w-5" />
          <span>Failed to connect to iLO</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfig(true)}
            className="ml-auto text-xs"
          >
            <Settings className="h-3.5 w-3.5 mr-1" />
            Configure
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className={cn(
          "relative rounded-lg overflow-hidden",
          "bg-gradient-to-b from-card to-background",
          "border border-border/60"
        )}>
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          {/* Header - always visible */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Server icon with status */}
                <div className={cn(
                  "relative flex h-12 w-12 items-center justify-center rounded-lg",
                  "bg-gradient-to-br from-amber-500/20 to-amber-500/5",
                  "border border-amber-500/30"
                )}>
                  <Server className="h-6 w-6 text-amber-500" />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-card",
                    status.powerState === 'on' ? 'bg-status-running' : 'bg-status-stopped'
                  )} />
                </div>

                {/* Server info */}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">HP iLO Control</h3>
                    <span className={cn(
                      "text-xs uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      status.powerState === 'on'
                        ? 'text-status-running border-status-running/30 bg-status-running/10'
                        : 'text-status-stopped border-status-stopped/30 bg-status-stopped/10'
                    )}>
                      {status.powerState}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{status.model}</p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Thermometer className="h-4 w-4 text-amber-500" />
                    <span className="font-mono">{status.temperatures.inlet}°C</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="font-mono">{status.powerConsumption}W</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className={cn("h-4 w-4", getHealthColor(status.health))} />
                    <span className={cn("text-xs uppercase", getHealthColor(status.health))}>
                      {status.health}
                    </span>
                  </div>
                </div>

                {/* Power controls and settings */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowConfig(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  
                  {status.powerState === 'off' ? (
                    <Button
                      size="sm"
                      className="gap-2 bg-status-running hover:bg-status-running/90"
                      onClick={() => handleAction('powerOn')}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === 'powerOn' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                      Power On
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2 hover:bg-status-stopped/10 hover:text-status-stopped hover:border-status-stopped/30 border border-transparent"
                        onClick={() => handleAction('powerOff')}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === 'powerOff' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PowerOff className="h-4 w-4" />
                        )}
                        Shutdown
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-transparent"
                        onClick={() => handleAction('reset')}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === 'reset' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Reset
                      </Button>
                    </>
                  )}
                  
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded details */}
          <CollapsibleContent>
            <div className="border-t border-border/40 p-4 space-y-4">
              {/* System info */}
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Hostname</span>
                  <p className="font-mono">{status.hostname}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Serial</span>
                  <p className="font-mono">{status.serialNumber}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">iLO Version</span>
                  <p className="font-mono">{status.iloVersion}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Uptime</span>
                  <p className="font-mono">{status.uptime}</p>
                </div>
              </div>

              {/* Temperatures */}
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Temperatures</span>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Inlet</span>
                    <span className="font-mono font-medium">{status.temperatures.inlet}°C</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">CPU 1</span>
                    <span className="font-mono font-medium">{status.temperatures.cpu1}°C</span>
                  </div>
                  {status.temperatures.cpu2 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
                      <Thermometer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">CPU 2</span>
                      <span className="font-mono font-medium">{status.temperatures.cpu2}°C</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fans */}
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Fans</span>
                <div className="flex gap-2 mt-2">
                  {status.fans.map((fan, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border",
                        fan.status === 'ok'
                          ? 'bg-secondary/50 border-border/50'
                          : 'bg-status-error/10 border-status-error/30'
                      )}
                    >
                      <Fan className={cn(
                        "h-4 w-4",
                        fan.status === 'ok' ? 'text-muted-foreground' : 'text-status-error'
                      )} />
                      <span className="text-xs text-muted-foreground">{fan.name}</span>
                      <span className="font-mono font-medium">{fan.speed}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced power controls */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Advanced Power</span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs hover:bg-status-error/10 hover:text-status-error border border-transparent hover:border-status-error/30"
                    onClick={() => handleAction('forcePowerOff')}
                    disabled={actionLoading !== null || status.powerState === 'off'}
                  >
                    {actionLoading === 'forcePowerOff' ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <PowerOff className="h-3 w-3 mr-1" />
                    )}
                    Force Off
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs border border-transparent"
                    onClick={() => handleAction('powerCycle')}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'powerCycle' ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Zap className="h-3 w-3 mr-1" />
                    )}
                    Power Cycle
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => window.open(`https://${status.hostname}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open iLO Console
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmDialog !== null} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-status-error" />
              {confirmDialog?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.description}
              <br /><br />
              <strong>Are you sure you want to proceed?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog && executeAction(confirmDialog.action)}
              className="bg-status-stopped hover:bg-status-stopped/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
