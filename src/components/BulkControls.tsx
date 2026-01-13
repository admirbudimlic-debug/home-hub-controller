import { useState } from 'react';
import { Play, Square, RotateCcw, Radio, HardDrive, Cast, AlertTriangle, Loader2, Layers } from 'lucide-react';
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
  rx: { icon: Radio, label: 'RX', colorClass: 'text-rx', borderClass: 'border-rx/30', bgClass: 'bg-rx/5' },
  rec: { icon: HardDrive, label: 'REC', colorClass: 'text-rec', borderClass: 'border-rec/30', bgClass: 'bg-rec/5' },
  rtmp: { icon: Cast, label: 'RTMP', colorClass: 'text-rtmp', borderClass: 'border-rtmp/30', bgClass: 'bg-rtmp/5' },
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

  return (
    <>
      <div className={cn(
        "relative rounded-lg overflow-hidden",
        "bg-gradient-to-b from-card to-background",
        "border border-border/60"
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" />
            Bulk Operations
            {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </h3>
          
          <div className="grid grid-cols-3 gap-3">
            {services.map((service) => {
              const config = serviceConfig[service];
              const Icon = config.icon;

              return (
                <div 
                  key={service} 
                  className={cn(
                    "rounded-lg p-3",
                    "border",
                    config.borderClass,
                    config.bgClass
                  )}
                >
                  <div className={cn('flex items-center gap-2 font-semibold mb-3', config.colorClass)}>
                    <Icon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-widest">{config.label}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 h-8 text-xs hover:bg-status-running/10 hover:text-status-running hover:border-status-running/30 border border-transparent transition-all"
                      onClick={() => handleAction(service, 'start')}
                      disabled={isLoading}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 h-8 text-xs hover:bg-status-stopped/10 hover:text-status-stopped hover:border-status-stopped/30 border border-transparent transition-all"
                      onClick={() => handleAction(service, 'stop')}
                      disabled={isLoading}
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 h-8 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-transparent transition-all"
                      onClick={() => handleAction(service, 'restart')}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDialog !== null} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-status-error" />
              Confirm Bulk {confirmDialog?.action === 'stop' ? 'Stop' : 'Restart'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {confirmDialog?.action} all <strong>{confirmDialog?.service.toUpperCase()}</strong> services
              across all 9 channels. This action may interrupt active streams.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
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
