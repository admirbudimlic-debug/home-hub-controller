import { Play, Square, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceStatus, ServiceType } from '@/types/channel';
import { cn } from '@/lib/utils';

interface ServiceControlProps {
  channelId: number;
  service: ServiceType;
  status: ServiceStatus;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  isLoading?: boolean;
  compact?: boolean;
}

export function ServiceControl({
  status,
  onStart,
  onStop,
  onRestart,
  isLoading = false,
  compact = false,
}: ServiceControlProps) {
  const isRunning = status === 'running';

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {isLoading ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </Button>
        ) : (
          <>
            {!isRunning && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-status-running hover:bg-status-running/10"
                onClick={onStart}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            {isRunning && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-status-stopped hover:bg-status-stopped/10"
                onClick={onStop}
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onRestart}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <Button variant="secondary" size="sm" disabled className="gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </Button>
      ) : (
        <>
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              'gap-1.5',
              !isRunning && 'bg-status-running/10 text-status-running hover:bg-status-running/20'
            )}
            onClick={onStart}
            disabled={isRunning}
          >
            <Play className="h-3.5 w-3.5" />
            Start
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              'gap-1.5',
              isRunning && 'bg-status-stopped/10 text-status-stopped hover:bg-status-stopped/20'
            )}
            onClick={onStop}
            disabled={!isRunning}
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={onRestart}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </Button>
        </>
      )}
    </div>
  );
}
