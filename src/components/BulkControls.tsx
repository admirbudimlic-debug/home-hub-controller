import { useState } from 'react';
import { Play, Square, RotateCcw, Radio, HardDrive, Cast, AlertTriangle, Loader2 } from 'lucide-react';
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
import { ServiceType } from '@/types/channel';
import { cn } from '@/lib/utils';

interface BulkControlsProps {
  onBulkAction: (service: ServiceType, action: 'start' | 'stop' | 'restart') => Promise<void>;
  isLoading: boolean;
}

const serviceConfig = {
  rx: { icon: Radio, label: 'RX', colorClass: 'text-rx' },
  rec: { icon: HardDrive, label: 'REC', colorClass: 'text-rec' },
  rtmp: { icon: Cast, label: 'RTMP', colorClass: 'text-rtmp' },
};

export function BulkControls({ onBulkAction, isLoading }: BulkControlsProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    service: ServiceType;
    action: 'start' | 'stop' | 'restart';
  } | null>(null);

  const handleAction = (service: ServiceType, action: 'start' | 'stop' | 'restart') => {
    if (action === 'stop' || action === 'restart') {
      setConfirmDialog({ service, action });
    } else {
      onBulkAction(service, action);
    }
  };

  const confirmAction = () => {
    if (confirmDialog) {
      onBulkAction(confirmDialog.service, confirmDialog.action);
      setConfirmDialog(null);
    }
  };

  const services: ServiceType[] = ['rx', 'rec', 'rtmp'];
  const actions: Array<{ action: 'start' | 'stop' | 'restart'; icon: typeof Play; label: string }> = [
    { action: 'start', icon: Play, label: 'Start All' },
    { action: 'stop', icon: Square, label: 'Stop All' },
    { action: 'restart', icon: RotateCcw, label: 'Restart All' },
  ];

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          Bulk Operations
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {services.map((service) => {
            const config = serviceConfig[service];
            const Icon = config.icon;

            return (
              <div key={service} className="space-y-2">
                <div className={cn('flex items-center gap-2 font-medium', config.colorClass)}>
                  <Icon className="h-4 w-4" />
                  {config.label}
                </div>
                <div className="flex gap-1">
                  {actions.map(({ action, icon: ActionIcon, label }) => (
                    <Button
                      key={action}
                      variant="secondary"
                      size="sm"
                      className={cn(
                        'flex-1 text-xs',
                        action === 'start' && 'hover:bg-status-running/10 hover:text-status-running',
                        action === 'stop' && 'hover:bg-status-stopped/10 hover:text-status-stopped'
                      )}
                      onClick={() => handleAction(service, action)}
                      disabled={isLoading}
                    >
                      <ActionIcon className="h-3 w-3" />
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={confirmDialog !== null} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-status-error" />
              Confirm Bulk {confirmDialog?.action === 'stop' ? 'Stop' : 'Restart'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {confirmDialog?.action} all {confirmDialog?.service.toUpperCase()} services
              across all 9 channels. This action may interrupt active streams.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={cn(
                confirmDialog?.action === 'stop' && 'bg-status-stopped hover:bg-status-stopped/90'
              )}
            >
              {confirmDialog?.action === 'stop' ? 'Stop All' : 'Restart All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
