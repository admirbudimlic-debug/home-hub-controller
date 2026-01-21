import { cn } from '@/lib/utils';
import { Activity, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BitrateIndicatorProps {
  bitrateMbps: string | null;
  available: boolean;
  compact?: boolean;
  showLabel?: boolean;
}

export function BitrateIndicator({ 
  bitrateMbps, 
  available, 
  compact = false,
  showLabel = true 
}: BitrateIndicatorProps) {
  if (!available || !bitrateMbps) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}>
              <AlertTriangle className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
              {showLabel && <span>No stream</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No stream data available</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const mbps = parseFloat(bitrateMbps);
  
  // Determine color based on bitrate (assuming 20-30 Mbps is normal for broadcast)
  let bitrateColor = 'text-status-running';
  if (mbps < 5) bitrateColor = 'text-status-warning';
  else if (mbps > 40) bitrateColor = 'text-status-warning';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5",
            compact ? "text-xs" : "text-sm"
          )}>
            <Activity className={cn(
              compact ? "h-3 w-3" : "h-4 w-4",
              bitrateColor,
              "animate-pulse"
            )} />
            <span className={cn("font-mono font-medium tabular-nums", bitrateColor)}>
              {bitrateMbps}
            </span>
            {showLabel && <span className="text-muted-foreground">Mbps</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Current stream bitrate: {bitrateMbps} Mbps</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
