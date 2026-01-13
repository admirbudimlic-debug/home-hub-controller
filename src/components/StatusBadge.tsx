import { cn } from '@/lib/utils';
import { ServiceStatus } from '@/types/channel';

interface StatusBadgeProps {
  status: ServiceStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusConfig = {
  running: {
    label: 'Running',
    dotClass: 'bg-status-running',
    textClass: 'text-status-running',
    glowClass: 'shadow-[0_0_8px_hsl(150_80%_45%/0.5)]',
  },
  stopped: {
    label: 'Stopped',
    dotClass: 'bg-status-stopped',
    textClass: 'text-status-stopped',
    glowClass: 'shadow-[0_0_8px_hsl(0_75%_55%/0.5)]',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-status-error',
    textClass: 'text-status-error',
    glowClass: 'shadow-[0_0_8px_hsl(30_95%_55%/0.5)]',
  },
  unknown: {
    label: 'Unknown',
    dotClass: 'bg-status-unknown',
    textClass: 'text-status-unknown',
    glowClass: '',
  },
};

const sizeConfig = {
  sm: { dot: 'h-1.5 w-1.5', text: 'text-[10px]', gap: 'gap-1.5', padding: 'px-1.5 py-0.5' },
  md: { dot: 'h-2 w-2', text: 'text-xs', gap: 'gap-2', padding: 'px-2 py-1' },
  lg: { dot: 'h-2.5 w-2.5', text: 'text-sm', gap: 'gap-2', padding: 'px-2.5 py-1' },
};

export function StatusBadge({ status, showLabel = true, size = 'md', pulse = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = sizeConfig[size];

  return (
    <div className={cn(
      'flex items-center rounded-full',
      sizeClasses.gap,
      sizeClasses.padding,
      'bg-secondary/60 border border-border/50'
    )}>
      <span
        className={cn(
          'rounded-full',
          sizeClasses.dot,
          config.dotClass,
          pulse && status === 'running' && 'status-pulse',
          config.glowClass
        )}
      />
      {showLabel && (
        <span className={cn(
          'font-medium uppercase tracking-wider',
          sizeClasses.text,
          config.textClass
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
}
