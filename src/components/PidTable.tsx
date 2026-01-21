import { StreamPid } from '@/types/stream';
import { cn } from '@/lib/utils';
import { Lock, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PidTableProps {
  pids: StreamPid[];
  compact?: boolean;
}

const getPidTypeColor = (type: string): string => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('video')) return 'text-rx';
  if (lowerType.includes('audio')) return 'text-rec';
  if (lowerType.includes('pat') || lowerType.includes('pmt')) return 'text-primary';
  if (lowerType.includes('pcr')) return 'text-rtmp';
  return 'text-muted-foreground';
};

export function PidTable({ pids, compact = false }: PidTableProps) {
  if (!pids || pids.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <AlertTriangle className="h-4 w-4 mr-2" />
        No PID data available
      </div>
    );
  }

  // Filter out null packets and sort by bitrate
  const displayPids = pids
    .filter(p => p.pid !== 8191) // Filter out null packets
    .slice(0, compact ? 5 : undefined);

  return (
    <div className="rounded-md border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/60">
            <TableHead className="w-20">PID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="w-28 text-right">Bitrate</TableHead>
            <TableHead className="w-24">Share</TableHead>
            {!compact && <TableHead className="w-16 text-center">Flags</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayPids.map((pid) => (
            <TableRow 
              key={pid.pid} 
              className="hover:bg-muted/30 border-border/40"
            >
              <TableCell className="font-mono text-sm">
                {pid.pid}
              </TableCell>
              <TableCell>
                <span className={cn("text-sm font-medium", getPidTypeColor(pid.type))}>
                  {pid.type}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {pid.bitrateMbps} Mbps
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={parseFloat(pid.percentage)} 
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                    {pid.percentage}%
                  </span>
                </div>
              </TableCell>
              {!compact && (
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {pid.scrambled && (
                      <Badge variant="secondary" className="text-xs px-1">
                        <Lock className="h-3 w-3" />
                      </Badge>
                    )}
                    {pid.discontinuities > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5">
                        {pid.discontinuities}
                      </Badge>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {compact && pids.length > 5 && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/40 text-center">
          +{pids.length - 5} more PIDs
        </div>
      )}
    </div>
  );
}
