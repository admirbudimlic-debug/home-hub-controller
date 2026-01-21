import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ConnectionIndicator() {
  const { status, message, url } = useConnectionStatus(10000);

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-status-running',
      bgColor: 'bg-status-running',
      label: 'Connected',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-status-error',
      bgColor: 'bg-status-error',
      label: 'Disconnected',
    },
    checking: {
      icon: Loader2,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted-foreground',
      label: 'Checking...',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-muted-foreground cursor-help">
            <div className="relative">
              <Icon className={cn(
                'h-4 w-4',
                config.color,
                status === 'checking' && 'animate-spin'
              )} />
              {status === 'connected' && (
                <div className="absolute inset-0 animate-ping">
                  <Wifi className="h-4 w-4 text-status-running opacity-40" />
                </div>
              )}
            </div>
            <span className="text-xs uppercase tracking-wider">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground font-mono break-all">{url}</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
